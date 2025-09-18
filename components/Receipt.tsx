import React, { useRef } from 'react';
import type { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Printer, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import DbImage from '../components/DbImage';

interface ReceiptProps {
  transaction: Transaction | null;
  onClose: () => void;
}

const getLogoDataUrl = async (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

const Receipt: React.FC<ReceiptProps> = ({ transaction, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const settings = useLiveQuery(() => db.settings.get('app'));

  if (!transaction) return null;

  const generateReceiptHTML = async (transaction: Transaction, settings: any, logoUrl: string | undefined) => {
    const itemsHTML = transaction.items.map(item => `
      <div class="text-xs mb-1">
        <p class="font-semibold">${item.name}</p>
        <div class="flex justify-between">
          <span>${item.qty} x ${formatCurrency(item.unitPrice)}</span>
          <span>${formatCurrency(item.lineTotal)}</span>
        </div>
      </div>
    `).join('');

    let logoImg = '';
    if (logoUrl) {
      const logoFile = await db.files.get(logoUrl);
      if (logoFile?.blob) {
        const dataUrl = await getLogoDataUrl(logoFile.blob);
        // Fix: Ensure the blob is fully loaded before creating data URL
        if (dataUrl) {
logoImg = `<img src="${dataUrl}" alt="Logo" style="height: 140px; width: auto; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto; border-radius: 12px;" />`;
        }
      }
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          @page {
            size: 58mm 210mm;
            margin: 0;
          }
          @media print {
            .receipt {
              width: 58mm !important;
              max-width: 58mm !important;
              min-width: 58mm !important;
              font-size: 19px !important;
              padding: 8px !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
              color: black !important;
            }
            body {
              margin: 0 !important;
              padding: 0 !important;
            }
          }
          .receipt {
            font-family: Arial, sans-serif;
            color: black;
          }
          .text-center { text-align: center; }
          .text-xs { font-size: 16px; }
          .font-bold { font-weight: bold; }
          .font-semibold { font-weight: 600; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mt-4 { margin-top: 16px; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .space-y-1 > * + * { margin-top: 4px; }
          .text-sm { font-size: 14px; }
          hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="text-center">
            ${logoImg}
            <h2 class="text-xl font-bold">${settings?.businessName || 'Warung POS'}</h2>
            <p class="text-xs">${settings?.address || ''}</p>
            <hr />
          </div>
          <div class="text-xs">
            <p>No: ${transaction.receiptNo}</p>
            <p>Tgl: ${formatDate(transaction.date)}</p>
            <p>Kasir: ${JSON.parse(localStorage.getItem('warung_pos_user') || '{}').username || 'N/A'}</p>
            ${transaction.customerSnapshot ? `<p>Plgn: ${transaction.customerSnapshot.name}</p>` : ''}
          </div>
          <hr />
          <div>
            ${itemsHTML}
          </div>
          <hr />
          <div class="text-xs space-y-1">
            <div class="flex justify-between">
              <span>Subtotal</span>
              <span>${formatCurrency(transaction.subtotal)}</span>
            </div>
            ${transaction.discount ? `<div class="flex justify-between">
              <span>Diskon</span>
              <span>-${formatCurrency(transaction.discount)}</span>
            </div>` : ''}
            <div class="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>${formatCurrency(transaction.total)}</span>
            </div>
            <div class="flex justify-between">
              <span>Tunai</span>
              <span>${formatCurrency(transaction.cashReceived)}</span>
            </div>
            <div class="flex justify-between">
              <span>Kembali</span>
              <span>${formatCurrency(transaction.changeDue)}</span>
            </div>
          </div>
          <hr />
          <p class="text-center text-xs mt-4">Terima kasih!</p>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    const currentSettings = await db.settings.get('app');
    const html = await generateReceiptHTML(transaction, currentSettings, currentSettings?.logoUrl);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const receiptContent = (
    <div className="receipt text-gray-200">
      <div className="text-center">
{settings?.logoUrl && <DbImage fileId={settings.logoUrl} className="h-16 w-auto mx-auto mb-2 border-2 border-gray-400 rounded" />}
        <h2 className="text-xl font-bold">{settings?.businessName || 'Warung POS'}</h2>
        <p className="text-xs">{settings?.address || ''}</p>
        <hr className="my-2 border-gray-600 border-dashed" />
      </div>
      <div className="text-xs">
        <p>No: {transaction.receiptNo}</p>
        <p>Tgl: {formatDate(transaction.date)}</p>
        <p>Kasir: {JSON.parse(localStorage.getItem('warung_pos_user') || '{}').username || 'N/A'}</p>
        {transaction.customerSnapshot && (
          <p>Plgn: {transaction.customerSnapshot.name}</p>
        )}
      </div>
      <hr className="my-2 border-gray-600 border-dashed" />
      <div>
        {transaction.items.map((item, index) => (
          <div key={index} className="text-xs mb-1">
            <p className="font-semibold">{item.name}</p>
            <div className="flex justify-between">
              <span>{item.qty} x {formatCurrency(item.unitPrice)}</span>
              <span>{formatCurrency(item.lineTotal)}</span>
            </div>
          </div>
        ))}
      </div>
      <hr className="my-2 border-gray-600 border-dashed" />
      <div className="text-xs space-y-1">
        <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatCurrency(transaction.subtotal)}</span>
        </div>
        {transaction.discount && (
            <div className="flex justify-between">
                <span>Diskon</span>
                <span>-{formatCurrency(transaction.discount)}</span>
            </div>
        )}
        <div className="flex justify-between font-bold text-sm">
            <span>TOTAL</span>
            <span>{formatCurrency(transaction.total)}</span>
        </div>
        <div className="flex justify-between">
            <span>Tunai</span>
            <span>{formatCurrency(transaction.cashReceived)}</span>
        </div>
        <div className="flex justify-between">
            <span>Kembali</span>
            <span>{formatCurrency(transaction.changeDue)}</span>
        </div>
      </div>
      <hr className="my-2 border-gray-600 border-dashed" />
      <p className="text-center text-xs mt-4">Terima kasih!</p>
    </div>
  );

  return (
    <>
      {/* Modal version */}
      <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4" onClick={onClose} role="dialog" aria-modal="true">
        <div className="relative z-61 w-[min(92vw,480px)] max-h-[85vh] flex flex-col rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between no-print mb-4">
              <h2 id="modal-title" className="text-lg font-semibold">Struk Transaksi</h2>
              <button type="button" onClick={onClose} title="Tutup" className="p-1 rounded-full text-gray-400 hover:bg-neutral-800">
                  <X className="h-5 w-5" />
              </button>
          </div>
          <div className="flex-grow overflow-y-auto pr-2 nice-scrollbar">
            <div ref={receiptRef} className="receipt rounded-xl border p-4 bg-neutral-900 border-neutral-700 text-gray-200">
              {receiptContent}
            </div>
          </div>
          <div className="mt-6 flex gap-2 no-print">
              <button onClick={onClose} className="w-full h-10 rounded-lg px-4 font-medium border border-neutral-700 hover:bg-neutral-800">
                  Tutup
              </button>
              <button onClick={handlePrint} title="Cetak Struk" className="w-full h-10 rounded-lg px-4 font-medium bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 disabled:opacity-50 flex items-center justify-center">
                  <Printer className="h-5 w-5 mr-2" /> Cetak
              </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Receipt;
