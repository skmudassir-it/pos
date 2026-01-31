"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [taxRate, setTaxRate] = useState<string>('0');
    const [initialAmount, setInitialAmount] = useState<string>('0');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const taxRes = await fetch('/api/settings/tax');
            const taxData = await taxRes.json();
            setTaxRate(taxData.rate.toString());

            const amountRes = await fetch('/api/settings/register-amount');
            const amountData = await amountRes.json();
            setInitialAmount(amountData.amount.toString());
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        try {
            const taxRes = await fetch('/api/settings/tax', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rate: parseFloat(taxRate) })
            });

            const amountRes = await fetch('/api/settings/register-amount', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: parseFloat(initialAmount) })
            });

            if (taxRes.ok && amountRes.ok) {
                setMessage('Settings updated successfully!');
            } else {
                setMessage('Failed to update some settings');
            }
        } catch (error) {
            console.error('Failed to save settings', error);
            setMessage('Error saving settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
                    <button
                        onClick={() => router.push('/admin/dashboard')}
                        className="text-blue-600 hover:underline"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {loading ? (
                    <div className="text-gray-500">Loading settings...</div>
                ) : (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Tax Rate (%)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={taxRate}
                                onChange={(e) => setTaxRate(e.target.value)}
                                className="w-full px-4 py-2 text-gray-900 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Enter the percentage tax to be applied to all sales (e.g., 8.25 for 8.25%).
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Register Initial Amount ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={initialAmount}
                                onChange={(e) => setInitialAmount(e.target.value)}
                                className="w-full px-4 py-2 text-gray-900 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                Default opening amount (float/cash drawer start) for new register sessions.
                            </p>
                        </div>

                        {message && (
                            <div className={`p-4 rounded-md ${message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {message}
                            </div>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`w-full py-2 px-4 text-white font-semibold rounded-md shadow-sm 
                                ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
                                transition duration-150`}
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
