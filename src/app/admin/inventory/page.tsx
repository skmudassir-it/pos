"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
    id: number;
    name: string;
    price: number;
}

export default function InventoryManager() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchProducts = async () => {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || !newPrice) return;

        setLoading(true);
        await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName, price: newPrice })
        });
        setNewName('');
        setNewPrice('');
        setLoading(false);
        fetchProducts();
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm('Delete this product?')) return;
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        fetchProducts();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Inventory Manager</h1>
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="px-4 py-2 text-gray-600 bg-white border rounded hover:bg-gray-50"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* Add Product Form */}
                <div className="p-6 mb-8 bg-white rounded-lg shadow-sm">
                    <h2 className="mb-4 text-lg font-semibold text-gray-700">Add New Product</h2>
                    <form onSubmit={handleAddProduct} className="flex gap-4">
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Product Name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="w-32">
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Price"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Item'}
                        </button>
                    </form>
                </div>

                {/* Product List */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase border-b">ID</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase border-b">Name</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase border-b">Price</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase border-b">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {products.map((product) => (
                                <tr key={product.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-500">#{product.id}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">${product.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <button
                                            onClick={() => handleDeleteProduct(product.id)}
                                            className="text-red-600 hover:text-red-900 font-medium"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {products.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No products found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
