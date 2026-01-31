"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Transaction {
    id: string;
    receiptNo: string;
    date: string;
    qty: number;
    total: number;
    subtotal?: number;
    tax?: number;
    method: 'cash' | 'card';
}

export default function SalesManager() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            let url = '/api/transactions';
            const params = new URLSearchParams();
            if (fromDate) params.append('from', fromDate);
            if (toDate) params.append('to', toDate);

            const queryString = params.toString();
            if (queryString) url += `?${queryString}`;

            const res = await fetch(url);
            const data = await res.json();
            setTransactions(data.transactions || []);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Sales Manager</h1>
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="px-4 py-2 text-gray-600 bg-white border rounded hover:bg-gray-50"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 mb-8 bg-white rounded-lg shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-gray-700">Filter Transactions</h2>
                    <div className="flex items-end gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-600">From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-600">To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={fetchTransactions}
                            className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Filter
                        </button>
                        <button
                            onClick={() => {
                                setFromDate('');
                                setToDate('');
                                setTimeout(fetchTransactions, 0); // trigger reload after state update
                            }}
                            className="px-6 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-hidden bg-white rounded-lg shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Receipt No</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Date & Time</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Qty</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Subtotal</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Tax</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Total</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Method</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No transactions found</td>
                                </tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.receiptNo}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(t.date).toLocaleDateString()} {new Date(t.date).toLocaleTimeString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{t.qty}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">${Number(t.subtotal || t.total).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">${Number(t.tax || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">${Number(t.total).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${t.method === 'card' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                {t.method.toUpperCase()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
