"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Product = {
    id: number;
    name: string;
    price: number;
};

const PRODUCTS: Product[] = []; // Replaced by dynamic state

type CartItem = Product & { quantity: number };

const BILLS = [100, 50, 20, 10, 5, 2, 1];
const COINS = [1, 0.50, 0.25, 0.10, 0.05, 0.01];
type Denominations = { [key: number]: number };

export default function POSMain() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [amountTendered, setAmountTendered] = useState<string>('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [taxRate, setTaxRate] = useState<number>(0);

    const [userName, setUserName] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // Close Register State
    const [isCloseRegisterOpen, setIsCloseRegisterOpen] = useState(false);
    const [openingAmount, setOpeningAmount] = useState(0);
    const [closingBillCounts, setClosingBillCounts] = useState<Denominations>({});
    const [closingCoinCounts, setClosingCoinCounts] = useState<Denominations>({});
    const [closingTotal, setClosingTotal] = useState(0);
    const [sessionSales, setSessionSales] = useState(0);

    const router = useRouter();

    useEffect(() => {
        fetch('/api/products')
            .then(res => res.json())
            .then(data => setProducts(data))
            .catch(err => console.error('Failed to load products', err));

        fetch('/api/settings/tax')
            .then(res => res.json())
            .then(data => setTaxRate(data.rate || 0))
            .catch(err => console.error('Failed to load tax rate', err));

        // Load user from local storage
        const storedUser = localStorage.getItem('pos_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setUserName(user.name || user.username);
            } catch (e) {
                console.error('Failed to parse user', e);
            }
        }
    }, []);

    // Effect to calculate closing total
    useEffect(() => {
        let t = 0;
        BILLS.forEach(bill => {
            t += (closingBillCounts[bill] || 0) * bill;
        });
        COINS.forEach(coin => {
            t += (closingCoinCounts[coin] || 0) * coin;
        });
        setClosingTotal(t);
    }, [closingBillCounts, closingCoinCounts]);

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const cartTotal = subtotal + taxAmount;
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

    const tendered = parseFloat(amountTendered) || 0;
    const changeDue = tendered - cartTotal;

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (id: number) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = () => setCart([]);

    const handleCloseRegister = async () => {
        if (cart.length > 0) {
            if (!confirm('Cart is not empty. Closing register will clear the cart. Continue?')) return;
        }

        try {
            const res = await fetch('/api/register/current');
            const data = await res.json();
            if (data.success) {
                setOpeningAmount(Number(data.session.opening_amount));
                setSessionSales(Number(data.session_sales || 0));
                setIsCloseRegisterOpen(true);
            } else {
                alert('Could not fetch open register session.');
            }
        } catch (error) {
            console.error('Failed to fetch register session', error);
            alert('Failed to fetch register session');
        }
    };

    const handleClosingBillChange = (value: number, count: string) => {
        setClosingBillCounts(prev => ({ ...prev, [value]: parseInt(count) || 0 }));
    };

    const handleClosingCoinChange = (value: number, count: string) => {
        setClosingCoinCounts(prev => ({ ...prev, [value]: parseInt(count) || 0 }));
    };

    const submitCloseRegister = async () => {
        const details = {
            bills: closingBillCounts,
            coins: closingCoinCounts
        };

        try {
            const res = await fetch('/api/register/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    closing_amount: closingTotal,
                    closing_details: details
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Register Closed Successfully!\n\nOpening Amount: $${openingAmount.toFixed(2)}\nTotal Counted: $${closingTotal.toFixed(2)}\nTakeout (Profit): $${(closingTotal - openingAmount).toFixed(2)}`);
                router.push('/');
            } else {
                alert('Failed to close register: ' + data.message);
            }
        } catch (error) {
            console.error('Failed to close register', error);
            alert('Failed to close register');
        }
    };

    const handleLogout = () => {
        router.push('/');
    };

    const handlePayment = () => {
        if (cart.length === 0) return alert('Cart is empty');
        setIsPaymentModalOpen(true);
    };

    const confirmPayment = async () => {
        // Fix floating point precision issues by rounding to 2 decimals before checking
        const roundedChange = parseFloat(changeDue.toFixed(2));

        if (roundedChange < 0) return alert('Insufficient amount tendered');
        if (paymentMethod === 'card' && roundedChange > 0) return alert('Card payment cannot exceed the total amount');

        try {
            const transactionData = {
                receiptNo: `REC-${Date.now()}`,
                date: new Date(),
                qty: totalQty,
                total: cartTotal,
                subtotal: subtotal,
                tax: taxAmount,
                method: paymentMethod,
                items: [...cart],
                changeDue: changeDue,
                amountTendered: tendered
            };

            await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(transactionData)
            });

            alert(`Payment Successful via ${paymentMethod.toUpperCase()}! Change due: $${changeDue.toFixed(2)}`);

            setCart([]);
            setAmountTendered('');
            setPaymentMethod('cash');
            setIsPaymentModalOpen(false);
        } catch (error) {
            console.error('Failed to record transaction', error);
            alert('Payment processed locally, but failed to save transaction log.');
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b z-10 relative">
                <div className="flex items-center space-x-4 flex-1">
                    <h1 className="text-xl font-bold text-gray-800 shrink-0">POS System</h1>
                    {userName && (
                        <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full shrink-0">
                            {userName}
                        </span>
                    )}
                    {/* Search Bar */}
                    <div className="mx-4 flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <div className="space-x-4">
                    <button onClick={handleLogout} className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
                        Logout
                    </button>
                    <button onClick={handleCloseRegister} className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 font-medium">
                        Close Register
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Products Grid */}
                <div className="w-2/3 p-6 overflow-y-auto">
                    <h2 className="mb-4 text-lg font-semibold text-gray-700">Products</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {products
                            .filter(product => product.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(product => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="p-6 text-center transition bg-white rounded-lg shadow hover:shadow-md active:bg-blue-50 flex flex-col items-center justify-center h-full min-h-[120px]"
                                >
                                    <div className="text-lg font-medium text-gray-800 mb-2">{product.name}</div>
                                    <div className="text-gray-500 font-semibold">${Number(product.price).toFixed(2)}</div>
                                </button>
                            ))}
                        {products.filter(product => product.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                            <div className="col-span-3 text-center py-10 text-gray-500">
                                No products found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                </div>

                {/* Cart */}
                <div className="flex flex-col w-1/3 bg-white border-l shadow-xl">
                    <div className="flex-1 p-6 overflow-y-auto">
                        <h2 className="mb-4 text-lg font-semibold text-gray-700">Current Order</h2>
                        {cart.length === 0 ? (
                            <p className="text-gray-400 italic">No items in cart</p>
                        ) : (
                            <div className="space-y-3">
                                {cart.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                        <div>
                                            <div className="font-medium text-gray-800">{item.name}</div>
                                            <div className="text-sm text-gray-800 font-medium">${Number(item.price).toFixed(2)} x {item.quantity}</div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <span className="font-bold text-gray-900">${(Number(item.price) * item.quantity).toFixed(2)}</span>
                                            <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">&times;</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-gray-50 border-t space-y-2">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Tax ({taxRate}%)</span>
                            <span>${taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between mb-4 text-xl font-bold text-gray-800 pt-2 border-t">
                            <span>Total</span>
                            <span>${cartTotal.toFixed(2)}</span>
                        </div>
                        <button
                            onClick={handlePayment}
                            disabled={cart.length === 0}
                            className="w-full py-4 text-lg font-bold text-white transition bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Pay ${cartTotal.toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                    <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-2xl">
                        <h2 className="mb-6 text-2xl font-bold text-gray-800">Payment</h2>

                        <div className="mb-6 space-y-4">
                            <div className="flex justify-between text-lg border-b pb-4">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-lg border-b pb-4">
                                <span className="text-gray-600">Tax:</span>
                                <span className="font-medium">${taxAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xl">
                                <span className="text-gray-800 font-bold">Total Due:</span>
                                <span className="font-bold text-gray-900">${cartTotal.toFixed(2)}</span>
                            </div>

                            {/* Payment Method Selector */}
                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">Payment Method</label>
                                <div className="flex space-x-4">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`flex-1 py-2 font-semibold rounded border ${paymentMethod === 'cash' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        Cash
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPaymentMethod('card');
                                            setAmountTendered(cartTotal.toFixed(2));
                                        }}
                                        className={`flex-1 py-2 font-semibold rounded border ${paymentMethod === 'card' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                                    >
                                        Card
                                    </button>
                                </div>
                            </div>


                            <div>
                                <label className="block mb-2 text-sm font-medium text-gray-700">Amount Tendered</label>
                                <div className="flex space-x-2">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amountTendered}
                                        onChange={(e) => setAmountTendered(e.target.value)}
                                        className="flex-1 px-4 py-3 text-lg text-gray-900 border rounded focus:ring-2 focus:ring-green-500"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <button
                                        onClick={() => setAmountTendered(cartTotal.toFixed(2))}
                                        className="px-4 py-2 font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200"
                                    >
                                        Exact
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between p-4 rounded bg-gray-50">
                                <span className="font-medium text-gray-700">Change Due:</span>
                                <span className={`text-xl font-bold ${parseFloat(changeDue.toFixed(2)) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ${Math.max(0, changeDue).toFixed(2)}
                                    {parseFloat(changeDue.toFixed(2)) < 0 && <span className="text-sm font-normal text-red-500 block"> (Insufficient)</span>}
                                </span>
                            </div>
                        </div>

                        <div className="flex space-x-4">
                            <button
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="flex-1 py-3 font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmPayment}
                                disabled={parseFloat(changeDue.toFixed(2)) < 0}
                                className="flex-1 py-3 font-bold text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                            >
                                Complete Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Close Register Modal */}
            {
                isCloseRegisterOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                        <div className="w-full max-w-4xl max-h-[90vh] p-8 bg-white rounded-lg shadow-2xl overflow-y-auto">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <h2 className="text-3xl font-bold text-gray-800">Close Register</h2>
                                <button onClick={() => setIsCloseRegisterOpen(false)} className="text-gray-500 hover:text-gray-700">
                                    <span className="text-2xl">&times;</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                {/* Bills */}
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Bills</h3>
                                    <div className="space-y-3">
                                        {BILLS.map(bill => (
                                            <div key={`close-bill-${bill}`} className="flex items-center justify-between">
                                                <label className="w-24 font-medium text-gray-700">${bill}</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="Count"
                                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500"
                                                    onChange={(e) => handleClosingBillChange(bill, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Coins */}
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Coins</h3>
                                    <div className="space-y-3">
                                        {COINS.map(coin => (
                                            <div key={`close-coin-${coin}`} className="flex items-center justify-between">
                                                <label className="w-24 font-medium text-gray-700">
                                                    {coin >= 1 ? `$${coin}` : `${(coin * 100).toFixed(0)}¢`}
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="Count"
                                                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-red-500"
                                                    onChange={(e) => handleClosingCoinChange(coin, e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-6 rounded-lg border-t space-y-3">
                                <div className="flex justify-between text-lg">
                                    <span className="text-gray-600">Opening Amount:</span>
                                    <span className="font-semibold">${openingAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg">
                                    <span className="text-gray-600">Total Sales (Since Open):</span>
                                    <span className="font-semibold text-blue-600">${sessionSales.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-lg">
                                    <span className="text-gray-600">Total Counted:</span>
                                    <span className="font-bold text-blue-600">${closingTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl pt-2 border-t border-gray-200">
                                    <span className="font-bold text-gray-800">Register Takeout (Profit):</span>
                                    <span className={`font-bold ${(closingTotal - openingAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ${(closingTotal - openingAmount).toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex space-x-4 mt-6 pt-4">
                                    <button
                                        onClick={() => setIsCloseRegisterOpen(false)}
                                        className="flex-1 py-3 font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={submitCloseRegister}
                                        className="flex-1 py-3 font-bold text-white bg-red-600 rounded hover:bg-red-700 shadow-md"
                                    >
                                        Post Sale & Close Register
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }


        </div >
    );
}
