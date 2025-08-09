import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function ClientPaymentHistoryModal({ client, payments, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 z-10 animate-fade-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Payment History: {client}</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payment history found for this client
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map(payment => (
                <div 
                  key={payment.txnId || payment.date} 
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-700/30"
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">
                      {new Date(payment.date).toLocaleDateString()}
                    </div>
                    <div className="font-bold text-green-600">
                      KSh {Number(payment.amount).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {payment.txnId || 'No transaction ID'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
