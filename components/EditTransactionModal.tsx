import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import type { Transaction, Customer, Product } from '../types';
import { formatCurrency } from '../utils/formatters';
import { X, Save, Plus, Trash2 } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ transaction, onClose }) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'RETAIL',
    date: new Date(),
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0,
    paymentType: 'CASH',
    receiptNo: '',
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (transaction) {
      setFormData(transaction);
    } else {
      // Generate new receipt number for new transaction
      const now = new Date();
      const receiptNo = `TXN-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      setFormData(prev => ({ ...prev, receiptNo }));
    }
  }, [transaction]);

  useEffect(() => {
    const loadData = async () => {
      const [customersData, productsData] = await Promise.all([
        db.customers.where('archived').notEqual(true).toArray(),
        db.products.where('archived').notEqual(true).toArray(),
      ]);
      setCustomers(customersData);
      setProducts(productsData);
    };
    loadData();
  }, []);

  const calculateTotals = (items: Transaction['items'], discount: number = 0) => {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const total = subtotal - discount;
    return { subtotal, total };
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items!];
    if (field === 'productId') {
      const product = products.find(p => p.id === parseInt(value));
      if (product) {
        newItems[index] = {
          ...newItems[index],
          productId: product.id!,
          code: product.code,
          name: product.name,
          unitPrice: formData.type === 'RETAIL' ? product.retailPrice : product.wholesalePrice,
          qty: newItems[index].qty || 1,
          lineTotal: (newItems[index].qty || 1) * (formData.type === 'RETAIL' ? product.retailPrice : product.wholesalePrice),
        };
      }
    } else if (field === 'qty') {
      const qty = parseInt(value) || 0;
      newItems[index].qty = qty;
      newItems[index].lineTotal = qty * newItems[index].unitPrice;
    }

    const { subtotal, total } = calculateTotals(newItems, formData.discount || 0);
    setFormData(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      total,
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), {
        productId: 0,
        code: '',
        name: '',
        unitPrice: 0,
        qty: 1,
        lineTotal: 0,
      }],
    }));
  };

  const removeItem = (index: number) => {
    const newItems = formData.items!.filter((_, i) => i !== index);
    const { subtotal, total } = calculateTotals(newItems, formData.discount || 0);
    setFormData(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      total,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.receiptNo) newErrors.receiptNo = 'No Struk wajib diisi';
    if (!formData.items?.length) newErrors.items = 'Minimal satu item harus ditambahkan';
    if (formData.total! < 0) newErrors.total = 'Total tidak boleh negatif';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const transactionData: Transaction = {
        ...formData,
        date: new Date(formData.date!),
      } as Transaction;

      if (transaction) {
        await db.transactions.update(transaction.id!, transactionData);
      } else {
        await db.transactions.add(transactionData);
      }
      onClose();
    } catch (error) {
      alert('Gagal menyimpan transaksi.');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass = "h-10 px-3 rounded-lg border border-neutral-700 bg-neutral-900 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-200">
            {transaction ? 'Edit Transaksi' : 'Tambah Transaksi'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">No Struk</label>
              <input
                type="text"
                value={formData.receiptNo}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptNo: e.target.value }))}
                className={fieldClass}
                required
              />
              {errors.receiptNo && <p className="text-red-500 text-sm mt-1">{errors.receiptNo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tanggal</label>
              <input
                type="date"
                value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ ...prev, date: new Date(e.target.value) }))}
                className={fieldClass}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tipe Transaksi</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'RETAIL' | 'WHOLESALE' }))}
                className={fieldClass}
              >
                <option value="RETAIL">Eceran</option>
                <option value="WHOLESALE">Grosir</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Pelanggan</label>
              <select
                value={formData.customerId || ''}
                onChange={(e) => {
                  const customerId = parseInt(e.target.value) || undefined;
                  const customer = customers.find(c => c.id === customerId);
                  setFormData(prev => ({
                    ...prev,
                    customerId,
                    customerSnapshot: customer ? {
                      memberNo: customer.memberNo,
                      name: customer.name,
                      phone: customer.phone,
                      address: customer.address,
                    } : undefined,
                  }));
                }}
                className={fieldClass}
              >
                <option value="">Pilih Pelanggan (Opsional)</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name} ({customer.memberNo})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-gray-300">Items</h3>
              <button type="button" onClick={addItem} className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-700 flex items-center">
                <Plus className="h-4 w-4 mr-1" /> Tambah Item
              </button>
            </div>

            {formData.items?.map((item, index) => (
              <div key={index} className="flex gap-2 items-end mb-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Produk</label>
                  <select
                    value={item.productId}
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    className={fieldClass}
                    required
                  >
                    <option value="">Pilih Produk</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>{product.name} ({product.code})</option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Qty</label>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                    className={fieldClass}
                    min="1"
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Harga</label>
                  <input
                    type="text"
                    value={formatCurrency(item.unitPrice)}
                    readOnly
                    className={`${fieldClass} bg-gray-700`}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Total</label>
                  <input
                    type="text"
                    value={formatCurrency(item.lineTotal)}
                    readOnly
                    className={`${fieldClass} bg-gray-700`}
                  />
                </div>
                <button type="button" onClick={() => removeItem(index)} className="bg-red-600 px-2 py-2 rounded hover:bg-red-700">
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
            {errors.items && <p className="text-red-500 text-sm">{errors.items}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Subtotal</label>
              <input
                type="text"
                value={formatCurrency(formData.subtotal || 0)}
                readOnly
                className={`${fieldClass} bg-gray-700`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Diskon</label>
              <input
                type="number"
                value={formData.discount || 0}
                onChange={(e) => {
                  const discount = parseFloat(e.target.value) || 0;
                  const { subtotal, total } = calculateTotals(formData.items || [], discount);
                  setFormData(prev => ({ ...prev, discount, subtotal, total }));
                }}
                className={fieldClass}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Total</label>
              <input
                type="text"
                value={formatCurrency(formData.total || 0)}
                readOnly
                className={`${fieldClass} bg-gray-700`}
              />
              {errors.total && <p className="text-red-500 text-sm mt-1">{errors.total}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700">
              Batal
            </button>
            <button type="submit" disabled={isLoading} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700 flex items-center">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionModal;
