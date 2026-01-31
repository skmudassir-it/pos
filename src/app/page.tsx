import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="mb-10 text-4xl font-bold text-gray-900">POS System</h1>
      <div className="space-y-4">
        <Link href="/login/admin" className="block px-8 py-4 text-lg font-semibold text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition">
          Admin Login
        </Link>
        <Link href="/login/user" className="block px-8 py-4 text-lg font-semibold text-center text-white bg-green-600 rounded-lg hover:bg-green-700 transition">
          User Login
        </Link>
      </div>
    </div>
  );
}
