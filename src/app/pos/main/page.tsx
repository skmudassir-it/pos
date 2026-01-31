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

export default function POSMain() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [amountTendered, setAmountTendered] = useState<string>('');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
    const [taxRate, setTaxRate] = useState<number>(0);
    const [userName, setUserName] = useState<string>('');

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
        if (confirm('Are you sure you want to close the register?')) {
            await fetch('/api/register/close', { method: 'POST' });
            router.push('/');
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
        if (changeDue < 0) return alert('Insufficient amount tendered');
        if (paymentMethod === 'card' && tendered > cartTotal) return alert('Card payment cannot exceed the total amount');

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
            <div className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b">
                <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-bold text-gray-800">POS System</h1>
                    {userName && (
                        <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded-full">
                            {userName}
                        </span>
                    )}
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
                        {products.map(product => (
                            <button
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="p-6 text-center transition bg-white rounded-lg shadow hover:shadow-md active:bg-blue-50"
                            >
                                <div className="text-lg font-medium text-gray-800">{product.name}</div>
                                <div className="text-gray-500">${Number(product.price).toFixed(2)}</div>
                            </button>
                        ))}
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
                                <span className={`text-xl font-bold ${changeDue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ${Math.max(0, changeDue).toFixed(2)}
                                    {changeDue < 0 && <span className="text-sm font-normal text-red-500 block"> (Insufficient)</span>}
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
                                disabled={changeDue < 0}
                                className="flex-1 py-3 font-bold text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                            >
                                Complete Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}
