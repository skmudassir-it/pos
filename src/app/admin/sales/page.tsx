"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

type Transaction = {
    id: number;
    receipt_no: string;
    date: string;
    qty: number;
    total: number; // or string from DB
    method: string;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function SalesManager() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    // Default to last 30 days
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);

    useEffect(() => {
        fetchSalesData();
    }, [startDate, endDate]);

    const fetchSalesData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics/sales?startDate=${startDate}&endDate=${endDate}`);
            const data = await res.json();
            if (data.success) {
                setTransactions(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch sales data', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Analytics Processing ---

    const totalSales = transactions.reduce((sum, t) => sum + Number(t.total), 0);
    const totalTxns = transactions.length;
    const avgSale = totalTxns > 0 ? totalSales / totalTxns : 0;

    // Line Chart Data: Daily Sales
    const salesByDate: { [key: string]: number } = {};
    transactions.forEach(t => {
        const dateKey = new Date(t.date).toLocaleDateString();
        salesByDate[dateKey] = (salesByDate[dateKey] || 0) + Number(t.total);
    });
    // Sort dates
    const lineChartData = Object.keys(salesByDate)
        .map(date => ({ date, sales: salesByDate[date] }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Pie Chart Data: Payment Methods
    const salesByMethod: { [key: string]: number } = {};
    transactions.forEach(t => {
        const method = t.method || 'Unknown';
        salesByMethod[method] = (salesByMethod[method] || 0) + Number(t.total);
    });
    const pieChartData = Object.keys(salesByMethod).map(method => ({
        name: method,
        value: salesByMethod[method]
    }));

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Sales Manager</h1>
                <button
                    onClick={() => router.push('/admin/dashboard')}
                    className="px-4 py-2 text-gray-700 bg-white border rounded hover:bg-gray-100"
                >
                    Back to Dashboard
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-lg shadow mb-8 flex flex-wrap gap-6 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={fetchSalesData}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
                >
                    Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Sales</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${totalSales.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Transactions</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalTxns}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Average Sale</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${avgSale.toFixed(2)}</p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500 text-xl">Loading data...</div>
            ) : (
                <>
                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        {/* Line Chart */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Sales Trend</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={lineChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                                        <Legend />
                                        <Line type="monotone" dataKey="sales" stroke="#8884d8" activeDot={{ r: 8 }} name="Sales ($)" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="bg-white p-6 rounded-lg shadow">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Methods</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieChartData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }: { name?: string; percent?: number }) => `${name || 'Unknown'} ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {pieChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-lg font-bold text-gray-800">Recent Transactions</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {transactions.map((t) => (
                                        <tr key={t.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(t.date).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {t.receipt_no}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {t.method}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                ${Number(t.total).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                No transactions found for the selected period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
