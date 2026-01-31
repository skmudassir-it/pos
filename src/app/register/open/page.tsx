"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BILLS = [100, 50, 20, 10, 5, 2, 1];
const COINS = [1, 0.50, 0.25, 0.10, 0.05, 0.01];

type Denominations = { [key: number]: number };

export default function OpenRegister() {
    const [billCounts, setBillCounts] = useState<Denominations>({});
    const [coinCounts, setCoinCounts] = useState<Denominations>({});
    const [total, setTotal] = useState(0);
    const router = useRouter();

    const handleBillChange = (value: number, count: string) => {
        setBillCounts(prev => ({ ...prev, [value]: parseInt(count) || 0 }));
    };

    const handleCoinChange = (value: number, count: string) => {
        setCoinCounts(prev => ({ ...prev, [value]: parseInt(count) || 0 }));
    };

    useEffect(() => {
        const fetchInitialAmount = async () => {
            try {
                const res = await fetch('/api/settings/register-amount');
                const data = await res.json();
                if (data.amount > 0) {
                    fillDenominations(data.amount);
                }
            } catch (error) {
                console.error('Failed to fetch initial amount', error);
            }
        };
        fetchInitialAmount();
    }, []);

    const fillDenominations = (amount: number) => {
        let remaining = Math.round(amount * 100); // work in cents
        const newBillCounts: Denominations = {};
        const newCoinCounts: Denominations = {};

        BILLS.forEach(bill => {
            const billCents = Math.round(bill * 100);
            if (remaining >= billCents) {
                const count = Math.floor(remaining / billCents);
                newBillCounts[bill] = count;
                remaining -= count * billCents;
            }
        });

        COINS.forEach(coin => {
            const coinCents = Math.round(coin * 100);
            if (remaining >= coinCents) {
                const count = Math.floor(remaining / coinCents);
                newCoinCounts[coin] = count;
                remaining -= count * coinCents;
            }
        });

        setBillCounts(newBillCounts);
        setCoinCounts(newCoinCounts);
    };
    useEffect(() => {
        let t = 0;
        BILLS.forEach(bill => {
            t += (billCounts[bill] || 0) * bill;
        });
        COINS.forEach(coin => {
            t += (coinCounts[coin] || 0) * coin;
        });
        setTotal(t);
    }, [billCounts, coinCounts]);

    const handleSubmit = async () => {
        const details = {
            bills: billCounts,
            coins: coinCounts
        };

        const res = await fetch('/api/register/open', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total, details }),
        });

        const data = await res.json();
        if (data.success) {
            alert(`Register opened successfully with $${total.toFixed(2)}`);
            router.push('/pos/main');
        } else {
            alert('Failed to open register');
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
                <div className="p-6 border-b">
                    <h1 className="text-3xl font-bold text-gray-800">Open Register</h1>
                    <p className="text-gray-600">Enter the opening cash details.</p>
                </div>

                <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-2">
                    {/* Bills Section */}
                    <div>
                        <h2 className="mb-4 text-xl font-semibold text-gray-700">Bills</h2>
                        <div className="space-y-4">
                            {BILLS.map(bill => (
                                <div key={`bill-${bill}`} className="flex items-center justify-between">
                                    <label className="w-24 font-medium text-gray-700">${bill}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Count"
                                        value={billCounts[bill] || ''}
                                        className="w-full px-3 py-2 text-gray-900 border rounded focus:ring-2 focus:ring-blue-500"
                                        onChange={(e) => handleBillChange(bill, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coins Section */}
                    <div>
                        <h2 className="mb-4 text-xl font-semibold text-gray-700">Coins</h2>
                        <div className="space-y-4">
                            {COINS.map(coin => (
                                <div key={`coin-${coin}`} className="flex items-center justify-between">
                                    <label className="w-24 font-medium text-gray-700">
                                        {coin >= 1 ? `$${coin}` : `${(coin * 100).toFixed(0)}¢`}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Count"
                                        value={coinCounts[coin] || ''}
                                        className="w-full px-3 py-2 text-gray-900 border rounded focus:ring-2 focus:ring-blue-500"
                                        onChange={(e) => handleCoinChange(coin, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-gray-100 border-t rounded-b-lg">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-2xl font-bold text-gray-800">Total Opening Amount:</span>
                        <span className="text-3xl font-bold text-green-600">${total.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={handleSubmit}
                        className="w-full py-4 text-xl font-bold text-white transition bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transform hover:scale-[1.01]"
                    >
                        Open Register
                    </button>
                </div>
            </div>
        </div>
    );
}
