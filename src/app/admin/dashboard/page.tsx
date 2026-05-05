'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ products: 0, users: 0, openRegister: false, todaySales: 0, todayTxns: 0 });
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const handleLogout = () => {
        document.cookie = 'pos_token=; Max-Age=0; path=/';
        router.push('/');
    };

    useEffect(() => {
        async function fetchStats() {
            try {
                const [productsRes, usersRes, statusRes, salesRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/users'),
                    fetch('/api/register/status'),
                    fetch(`/api/analytics/sales?startDate=${new Date().toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`),
                ]);
                const products = await productsRes.json();
                const users = await usersRes.json();
                const status = await statusRes.json();
                const sales = await salesRes.json();

                const todaySales = sales.success ? (sales.data || []).reduce((sum: number, t: any) => sum + Number(t.total), 0) : 0;
                setStats({
                    products: Array.isArray(products) ? products.length : 0,
                    users: Array.isArray(users) ? users.length : 0,
                    openRegister: status.isOpen,
                    todaySales,
                    todayTxns: sales.success ? (sales.data || []).length : 0,
                });
            } catch (err) {
                console.error('Failed to fetch stats', err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    return (
        <div className="p-6 lg:p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h2>

            {loading ? (
                <div className="text-gray-500">Loading stats...</div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                            <p className="text-sm font-medium text-gray-500 uppercase">Products</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.products}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-purple-500">
                            <p className="text-sm font-medium text-gray-500 uppercase">Users</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
                            <p className="text-sm font-medium text-gray-500 uppercase">Today's Sales</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">${stats.todaySales.toFixed(2)}</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                            <p className="text-sm font-medium text-gray-500 uppercase">Register Status</p>
                            <p className={`text-3xl font-bold mt-2 ${stats.openRegister ? 'text-green-600' : 'text-red-500'}`}>
                                {stats.openRegister ? 'Open' : 'Closed'}
                            </p>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <h3 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link href="/admin/sales" className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                            <span className="text-2xl">💰</span>
                            <h4 className="font-semibold text-gray-900 mt-2">Sales Manager</h4>
                            <p className="text-sm text-gray-500 mt-1">View analytics, charts, and transactions</p>
                        </Link>
                        <Link href="/admin/inventory" className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                            <span className="text-2xl">📦</span>
                            <h4 className="font-semibold text-gray-900 mt-2">Inventory</h4>
                            <p className="text-sm text-gray-500 mt-1">Manage products and pricing</p>
                        </Link>
                        <Link href="/admin/reports" className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                            <span className="text-2xl">📋</span>
                            <h4 className="font-semibold text-gray-900 mt-2">Reports</h4>
                            <p className="text-sm text-gray-500 mt-1">Register history and Z-reports</p>
                        </Link>
                        <Link href="/admin/users" className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                            <span className="text-2xl">👥</span>
                            <h4 className="font-semibold text-gray-900 mt-2">Manage Users</h4>
                            <p className="text-sm text-gray-500 mt-1">Add, edit, or remove staff accounts</p>
                        </Link>
                        <Link href="/admin/settings" className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                            <span className="text-2xl">⚙️</span>
                            <h4 className="font-semibold text-gray-900 mt-2">Settings</h4>
                            <p className="text-sm text-gray-500 mt-1">Tax rate, register configuration</p>
                        </Link>
                    </div>

                    <div className="mt-8">
                        <button onClick={handleLogout} className="px-6 py-3 text-base font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 cursor-pointer transition-colors">
                            Logout
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
