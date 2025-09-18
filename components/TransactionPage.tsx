import React, { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import type { Product, Customer, TransactionItem, Transaction } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Search, X, Plus, Minus, Trash2, ScanLine } from 'lucide-react';
import Select, { components } from 'react-select';
import Receipt from './Receipt';
import { Dexie } from 'dexie';
import { priceFor, asInt } from '../utils/productUtils';
import { ensureError } from '../utils/errorUtils';
import DbImage from './DbImage';


interface TransactionPageProps {
  type: 'RETAIL' | 'WHOLESALE';
}

const CustomerOption = (props) => {
    const { innerProps, data } = props;
    const { customer } = data;
    return (
        <div {...innerProps} className="flex items-center gap-3 p-2 hover:bg-gray-700 cursor-pointer rounded-lg">
            <DbImage fileId={customer.photoFileId} className="avatar h-8 w-8 rounded-full object-cover flex-shrink-0" placeholderType="avatar" alt={`Photo of ${customer.name}`} />
            <div>
                <div className="font-semibold text-sm">{customer.name}</div>
                <div className="text-xs text-gray-500">{customer.memberNo}</div>
            </div>
        </div>
    );
};

// FIX: Changed component signature to avoid destructuring in arguments, which was causing a TypeScript type inference issue with react-select.
const CustomerSingleValue = (props) => {
    const { children, data } = props;
    const { customer } = data;
    return (
      <components.SingleValue {...props}>
        <div className="flex items-center gap-2">
            <DbImage fileId={customer.photoFileId} className="avatar h-6 w-6 rounded-full object-cover" placeholderType="avatar" alt={`Photo of ${customer.name}`} />
            <span>{children}</span>
        </div>
      </components.SingleValue>
    );
};

const TransactionPage: React.FC<TransactionPageProps> = ({ type }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState<TransactionItem[]>([]);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isPaymentOpen, setPaymentOpen] = useState(false);
    const [cashReceived, setCashReceived] = useState<number | string>('');
    const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);

    const products = useLiveQuery(() => 
        db.products
            .where('stockQty').above(0)
            .and(p => p.archived !== true)
            .toArray(), 
    []);
    const customers = useLiveQuery(() => db.customers.filter(c => !c.archived).toArray(), []);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        if (!searchTerm) return products.slice(0, 20);
        const lowerSearchTerm = searchTerm.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowerSearchTerm) || 
            p.code.toLowerCase().includes(lowerSearchTerm)
        );
    }, [products, searchTerm]);
    
    const customerOptions = useMemo(() => customers?.map(c => ({ 
        value: c.id!, 
        label: `${c.memberNo} - ${c.name}`,
        customer: c
    })) || [], [customers]);

    const addToCart = (product: Product) => {
        try {
            const { unitPrice, note } = priceFor(type, product);

            const existingItem = cart.find(item => item.productId === product.id);
            if (existingItem) {
                if (existingItem.qty < product.stockQty) {
                    updateQty(product.id!, existingItem.qty + 1);
                } else {
                    alert(`Stok untuk ${product.name} tidak mencukupi.`);
                }
            } else {
                if (product.stockQty > 0) {
                     setCart([...cart, {
                        productId: product.id!,
                        code: product.code,
                        name: product.name,
                        unitPrice: unitPrice,
                        qty: 1,
                        lineTotal: unitPrice,
                        note: note,
                    }]);
                } else {
                     alert(`${product.name} habis.`);
                }
            }
        } catch (e) {
            const err = ensureError(e);
            console.error(`Failed to add product ${product.code} to cart:`, err);
            alert("Produk ini belum memiliki harga grosir yang valid. Periksa di menu Produk.");
        }
    };
    
    const updateQty = (productId: number, newQty: number) => {
        const productInDb = products?.find(p => p.id === productId);
        if (!productInDb) return;

        if (newQty > productInDb.stockQty) {
            alert(`Stok tidak mencukupi. Sisa ${productInDb.stockQty}.`);
            newQty = productInDb.stockQty;
        }

        if (newQty <= 0) {
            removeFromCart(productId);
        } else {
             setCart(cart.map(item =>
                item.productId === productId ? { ...item, qty: newQty, lineTotal: newQty * item.unitPrice } : item
            ));
        }
    };

    const removeFromCart = (productId: number) => {
        setCart(cart.filter(item => item.productId !== productId));
    };
    
    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);

    const resetTransaction = useCallback(() => {
        setCart([]);
        setCustomer(null);
        setPaymentOpen(false);
        setCashReceived('');
        setSearchTerm('');
    }, []);
    
    const handlePayment = async () => {
        if (cart.length === 0) {
            alert("Keranjang kosong!");
            return;
        }
        if (Number(cashReceived) < subtotal) {
            alert("Uang tunai tidak cukup!");
            return;
        }
        
        const txData: Omit<Transaction, 'id'> = {
            type,
            date: new Date(),
            customerId: customer?.id,
            customerSnapshot: customer ? { memberNo: customer.memberNo, name: customer.name, phone: customer.phone, address: customer.address } : undefined,
            items: cart,
            subtotal,
            total: subtotal, // Assuming no discount for now
            paymentType: "CASH",
            cashReceived: Number(cashReceived),
            changeDue: Number(cashReceived) - subtotal,
            receiptNo: `TX-${Date.now()}`
        };

        try {
            await db.transaction('rw', db.transactions, db.products, db.customers, async () => {
                const txId = await db.transactions.add(txData as Transaction);
                
                for(const item of cart) {
                    await db.products.where({ id: item.productId }).modify(p => {
                        p.stockQty -= item.qty;
                    });
                }
                
                if (customer) {
                    await db.customers.where({ id: customer.id }).modify(c => {
                        c.totalTransactions += 1;
                    });
                }
                
                const finalTx = await db.transactions.get(txId);
                setLastTransaction(finalTx || null);
            });
            resetTransaction();
        } catch (error) {
            const err = ensureError(error);
            console.error("Failed to process transaction: ", error);
            alert(`Gagal menyimpan transaksi: ${err.message}`);
        }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            const exactMatch = products?.find(p =>
                p.code.toLowerCase() === searchTerm.trim().toLowerCase() &&
                p.stockQty > 0 &&
                !p.archived
            );

            if (exactMatch) {
                addToCart(exactMatch);
                setSearchTerm('');
            }
        }
    };

    const selectStyles = {
        control: (base, state) => ({
            ...base,
            height: '40px',
            minHeight: '40px',
            borderRadius: '0.5rem',
            backgroundColor: '#171717',
            border: state.isFocused
                ? '1px solid #3b82f6'
                : '1px solid #404040',
            boxShadow: state.isFocused ? '0 0 0 2px color-mix(in srgb, #3b82f6 45%, transparent)' : 'none',
            '&:hover': {
                borderColor: state.isFocused
                    ? '#3b82f6'
                    : '#525252',
            },
        }),
        menu: (base) => ({
            ...base,
            borderRadius: '0.75rem',
            backgroundColor: '#171717',
            border: `1px solid #404040`,
            boxShadow: '0 10px 30px rgba(0,0,0,.15)',
            overflow: 'hidden',
            zIndex: 50,
        }),
        menuList: (base) => ({
            ...base,
            padding: '4px',
            maxHeight: '220px',
            scrollbarWidth: 'thin',
            scrollbarColor: `rgba(82,82,91,.9) transparent`,
            '&::-webkit-scrollbar': { width: '12px', height: '12px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
                background: 'rgba(82,82,91,.9)',
                borderRadius: '8px',
                border: '3px solid transparent',
                backgroundClip: 'padding-box',
            },
        }),
        option: (base, state) => ({
            ...base,
            padding: '0', // custom component handles padding
            borderRadius: '8px',
            fontWeight: state.isSelected ? 600 : 400,
            backgroundColor: 'transparent',
            color: '#f5f5f5',
        }),
        singleValue: (base) => ({ ...base, color: '#f5f5f5' }),
        input: (base) => ({ ...base, color: '#f5f5f5' }),
        placeholder: (base) => ({ ...base, color: '#737373' }),
    };


    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* Main content - Product List */}
            <div className="w-3/5 p-4 flex flex-col">
                <h1 className="text-2xl font-bold mb-4">{type === 'RETAIL' ? 'Transaksi Eceran' : 'Transaksi Grosir'}</h1>
                <div className="relative mb-4">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                     <ScanLine className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                     <input
                        type="text"
                        placeholder="Cari produk (kode atau nama) atau scan barcode..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        className="w-full pl-10 pr-10 py-2 border rounded-lg bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                     />
                </div>
                <div className="flex-grow overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(p => {
                            const displayPrice = type === 'RETAIL' ? p.retailPrice : (asInt(p.wholesalePrice) ?? p.retailPrice);
                            const hasNoWholesalePrice = type === 'WHOLESALE' && Number.isNaN(asInt(p.wholesalePrice));

                            return (
                                <div key={p.id} onClick={() => addToCart(p)} className="border rounded-lg p-2 cursor-pointer hover:border-blue-400 hover:shadow-lg border-gray-700 flex flex-col bg-gray-800">
                                    <div className="aspect-[4/3] rounded-md overflow-hidden bg-gray-700 mb-2">
                                        <DbImage fileId={p.imageFileId} className="w-full h-full object-cover" alt={`Image of ${p.name}`} loading="lazy" />
                                    </div>
                                    <div className="flex-grow flex flex-col justify-between">
                                        <div>
                                            <p className="font-semibold text-sm truncate">{p.name}</p>
                                            {hasNoWholesalePrice && (
                                                <span className="text-xs bg-yellow-900 text-yellow-300 px-1.5 py-0.5 rounded">
                                                    Grosir?
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1">
                                            <p className="text-xs text-gray-400">Stok: {p.stockQty}</p>
                                            <p className="text-blue-400 font-bold text-sm">{formatCurrency(displayPrice)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Sidebar - Cart */}
            <div className="w-2/5 bg-gray-800 p-4 border-l border-gray-700 flex flex-col">
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1.5 text-gray-200">Pelanggan (Opsional)</label>
                    <div className="flex items-center gap-2">
                         <Select
                            options={customerOptions}
                            onChange={(option) => setCustomer(option?.customer || null)}
                            value={customer ? { value: customer.id!, label: `${customer.memberNo} - ${customer.name}`, customer: customer } : null}
                            isClearable
                            placeholder="Pilih pelanggan..."
                            styles={selectStyles}
                            className="flex-grow"
                            components={{ Option: CustomerOption, SingleValue: CustomerSingleValue }}
                        />
                    </div>
                </div>
                
                <h2 className="text-lg font-bold border-b pb-2 mb-2 border-gray-600">Keranjang ({cart.length})</h2>
                
                <div className="flex-grow overflow-y-auto -mr-4 pr-4 nice-scrollbar">
                    {cart.length === 0 ? (
                        <p className="text-center text-gray-500 mt-10">Keranjang masih kosong.</p>
                    ) : (
                        cart.map(item => (
                            <div key={item.productId} className="flex items-center mb-3">
                                <DbImage 
                                    fileId={products?.find(p => p.id === item.productId)?.imageFileId}
                                    className="h-10 w-10 rounded-md object-cover mr-3 flex-shrink-0"
                                    alt={`Image of ${item.name}`}
                                />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{item.name}</p>
                                    <div className="flex items-center">
                                        <p className="text-xs text-gray-400 mr-2">{formatCurrency(item.unitPrice)}</p>
                                        {item.note === 'fallback-retail' && (
                                            <span className="text-xs bg-orange-900 text-orange-300 px-1.5 py-0.5 rounded">
                                                Retail price used
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-1">
                                    <button type="button" onClick={() => updateQty(item.productId, item.qty - 1)} className="h-8 w-8 rounded-md border bg-neutral-800 hover:bg-neutral-700 border-neutral-700 flex-shrink-0 flex items-center justify-center">
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <input type="text" inputMode="numeric" value={item.qty} onChange={e => updateQty(item.productId, parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0)} className="w-12 h-8 px-1 text-center tabular-nums rounded-md border border-neutral-700 bg-neutral-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                                    <button type="button" onClick={() => updateQty(item.productId, item.qty + 1)} className="h-8 w-8 rounded-md border bg-neutral-800 hover:bg-neutral-700 border-neutral-700 flex-shrink-0 flex items-center justify-center">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="w-24 text-right font-semibold text-sm tabular-nums">{formatCurrency(item.lineTotal)}</p>
                                <button onClick={() => removeFromCart(item.productId)} className="ml-2 text-red-500" title="Hapus dari keranjang"><Trash2 className="h-4 w-4"/></button>
                            </div>
                        ))
                    )}
                </div>

                <div className="border-t pt-4 border-gray-600">
                    <div className="flex justify-between items-center text-lg font-bold mb-4">
                        <span>Total</span>
                        <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                    </div>
                     <button onClick={() => cart.length > 0 && setPaymentOpen(true)} disabled={cart.length === 0} className="w-full h-12 rounded-lg px-4 font-bold bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50">
                        BAYAR
                    </button>
                </div>
            </div>

            {/* Payment Modal */}
            {isPaymentOpen && (
                 <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4" onClick={() => setPaymentOpen(false)} role="dialog" aria-modal="true">
                    <div className="relative z-61 w-[min(92vw,480px)] max-h-[85vh] overflow-y-auto nice-scrollbar rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h2 id="modal-title" className="text-lg font-semibold">Pembayaran</h2>
                            <button type="button" onClick={() => setPaymentOpen(false)} title="Tutup" className="p-1 rounded-full text-gray-400 hover:bg-neutral-800">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mt-4 space-y-4">
                            <div className="flex justify-between text-lg">
                                <span>Total Belanja:</span>
                                <span className="font-bold tabular-nums">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="cashReceived" className="text-sm font-medium text-gray-200">Uang Tunai Diterima</label>
                                <div className="inline-flex items-center gap-1 w-full">
                                    <button type="button" onClick={() => setCashReceived(Math.max(0, Number(cashReceived || 0) - 1000))} className="h-10 w-10 rounded-lg border bg-neutral-900 hover:bg-neutral-800 border-neutral-700 flex-shrink-0 flex items-center justify-center"><Minus className="h-4 w-4" /></button>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        id="cashReceived"
                                        value={cashReceived}
                                        onChange={e => setCashReceived(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full h-10 px-3 text-right tabular-nums rounded-lg border border-neutral-700 bg-neutral-900 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                        placeholder="0"
                                        autoFocus
                                    />
                                    <button type="button" onClick={() => setCashReceived(Number(cashReceived || 0) + 1000)} className="h-10 w-10 rounded-lg border bg-neutral-900 hover:bg-neutral-800 border-neutral-700 flex-shrink-0 flex items-center justify-center"><Plus className="h-4 w-4" /></button>
                                </div>
                            </div>
                             <div className="flex justify-between text-lg">
                                <span>Kembalian:</span>
                                <span className="font-bold text-green-500 tabular-nums">{formatCurrency(Math.max(0, Number(cashReceived) - subtotal))}</span>
                            </div>
                        </div>
                         <div className="mt-6 flex justify-end gap-2">
                            <button type="button" onClick={() => setPaymentOpen(false)} className="h-10 rounded-lg px-4 font-medium border border-neutral-700 hover:bg-neutral-800">Batal</button>
                            <button onClick={handlePayment} disabled={Number(cashReceived) < subtotal} className="h-10 rounded-lg px-4 font-medium bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50">Konfirmasi Bayar</button>
                        </div>
                    </div>
                 </div>
            )}
            
            {/* Receipt Modal */}
            {lastTransaction && <Receipt transaction={lastTransaction} onClose={() => setLastTransaction(null)} />}
        </div>
    );
};

export default TransactionPage;