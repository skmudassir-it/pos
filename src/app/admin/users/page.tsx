"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    id: number;
    username: string;
    role: 'admin' | 'user';
    name: string;
}

export default function ManageUsers() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        role: 'user' as 'admin' | 'user'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic Validation
        if (!formData.username || !formData.name) return alert('Please fill in all required fields');
        if (!isEditing && !formData.password) return alert('Password is required for new users');

        try {
            const url = isEditing ? `/api/users/${editId}` : '/api/users';
            const method = isEditing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                alert(isEditing ? 'User updated successfully' : 'User created successfully');
                resetForm();
                fetchUsers();
            } else {
                alert('Operation failed');
            }
        } catch (error) {
            console.error('Submit error', error);
            alert('An error occurred');
        }
    };

    const handleEdit = (user: User) => {
        setIsEditing(true);
        setEditId(user.id);
        setFormData({
            username: user.username,
            password: '', // Don't show password, only needed if changing
            name: user.name,
            role: user.role
        });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchUsers();
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({ username: '', password: '', name: '', role: 'user' });
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Manage Users</h1>
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="px-4 py-2 text-gray-600 bg-white border rounded hover:bg-gray-50"
                    >
                        Back to Dashboard
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* User Form */}
                    <div className="md:col-span-1">
                        <div className="p-6 bg-white rounded-lg shadow-sm">
                            <h2 className="mb-4 text-xl font-semibold text-gray-700">{isEditing ? 'Edit User' : 'Create New User'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-600">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-600">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                                        placeholder="jdoe"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-600">
                                        {isEditing ? 'Password (leave blank to keep current)' : 'Password'}
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-600">Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                                        className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="user">User (Cashier)</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700"
                                    >
                                        {isEditing ? 'Update User' : 'Create User'}
                                    </button>
                                    {isEditing && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="px-4 py-2 text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Users List */}
                    <div className="md:col-span-2">
                        <div className="overflow-hidden bg-white rounded-lg shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Name</th>
                                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Username</th>
                                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Role</th>
                                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-gray-500 uppercase border-b">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No users found</td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{user.username}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {user.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm space-x-3">
                                                    <button
                                                        onClick={() => handleEdit(user)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(user.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
