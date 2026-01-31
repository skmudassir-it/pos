import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      <div className="p-10 space-y-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-200 drop-shadow-sm">
            POS System
          </h1>
          <p className="mt-3 text-purple-100/80 text-lg font-medium">
            Next Generation Point of Sale
          </p>
        </div>

        <div className="flex flex-col space-y-4 min-w-[300px]">
          <Link
            href="/login/admin"
            className="group relative flex items-center justify-center w-full px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl hover:from-blue-600 hover:to-indigo-700 hover:shadow-lg hover:-translate-y-1 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <polyline points="17 11 19 13 23 9"></polyline>
              </svg>
              Admin Login
            </span>
          </Link>

          <Link
            href="/login/user"
            className="group relative flex items-center justify-center w-full px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:-translate-y-1 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              User Login
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
