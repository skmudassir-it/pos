"use client";
import Link from 'next/link';

export default function AdminDashboard() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
            <h1 className="mb-10 text-4xl font-bold text-gray-900">Admin Dashboard</h1>
            <div className="grid grid-cols-1 gap-6 w-80">
                <Link href="/admin/sales" className="px-6 py-4 text-lg font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md">
                    Sales Manager
                </Link>
                <Link href="/admin/reports" className="px-6 py-4 text-lg font-medium text-center text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md">
                    Reports
                </Link>
                <Link href="/admin/inventory" className="px-6 py-4 text-lg font-medium text-center text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-md">
                    Inventory
                </Link>
                <Link href="/admin/users" className="px-6 py-4 text-lg font-medium text-center text-white bg-purple-600 rounded-lg hover:bg-purple-700 shadow-md">
                    Manage Users
                </Link>
                <Link href="/admin/settings" className="px-6 py-4 text-lg font-medium text-center text-white bg-gray-600 rounded-lg hover:bg-gray-700 shadow-md">
                    Settings
                </Link>
                <Link href="/" className="px-6 py-4 text-lg font-medium text-center text-red-600 border border-red-600 rounded-lg hover:bg-red-50 mt-4">
                    Logout
                </Link>
            </div>
        </div>
    );
}
