"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

type RegisterSession = {
    id: number;
    opened_at: string;
    closed_at: string | null;
    opening_amount: string;
    closing_amount: string | null;
    status: 'open' | 'closed';
};

export default function Reports() {
    const [sessions, setSessions] = useState<RegisterSession[]>([]);
    const [loading, setLoading] = useState(true);

    // Default Filters: Last 30 days
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);

    useEffect(() => {
        fetchSessions();
    }, [startDate, endDate]);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/reports/register-sessions?startDate=${startDate}&endDate=${endDate}`);
            const data = await res.json();
            if (data.success) {
                setSessions(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch sessions', error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Dashboard Metrics
    const totalSessions = sessions.length;
    const totalOpening = sessions.reduce((sum, s) => sum + Number(s.opening_amount), 0);
    const totalClosing = sessions.reduce((sum, s) => sum + (Number(s.closing_amount) || 0), 0);
    const totalDiff = sessions.reduce((sum, s) => {
        const close = Number(s.closing_amount) || 0;
        const open = Number(s.opening_amount);
        return s.closing_amount ? sum + (close - open) : sum;
    }, 0);


    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Register History (Z-Reports)</h1>
                <Link href="/admin/dashboard" className="px-4 py-2 text-gray-700 bg-white border rounded hover:bg-gray-100">
                    Back to Dashboard
                </Link>
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
                    onClick={fetchSessions}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
                >
                    Refresh
                </button>
            </div>

            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Sessions</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalSessions}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Opening ($)</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${totalOpening.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-teal-500">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Closing ($)</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${totalClosing.toFixed(2)}</p>
                </div>
                <div className={`bg-white p-6 rounded-lg shadow border-l-4 ${totalDiff >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Net Difference</h3>
                    <p className={`text-3xl font-bold mt-2 ${totalDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${totalDiff.toFixed(2)}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500">Loading reports...</div>
            ) : (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opened At</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closed At</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Opening ($)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Closing ($)</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Difference</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sessions.map((session) => {
                                const diff = session.closing_amount ? Number(session.closing_amount) - Number(session.opening_amount) : 0;
                                return (
                                    <tr key={session.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{session.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${session.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {session.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(session.opened_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {session.closed_at ? new Date(session.closed_at).toLocaleString() : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                            ${Number(session.opening_amount).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                            {session.closing_amount ? `$${Number(session.closing_amount).toFixed(2)}` : '-'}
                                        </td>
                                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {session.closing_amount ? `$${diff.toFixed(2)}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {sessions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        No register sessions found for this period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
