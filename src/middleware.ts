import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const ADMIN_ROUTES = ['/admin', '/api/products', '/api/users', '/api/settings', '/api/reports', '/api/analytics'];
const POS_ROUTES = ['/pos', '/register'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('pos_token')?.value;
    
    // Allow public routes
    if (pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/_next') || pathname.startsWith('/api/login')) {
        return NextResponse.next();
    }
    
    if (!token) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login/admin', request.url));
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        const response = pathname.startsWith('/api/')
            ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            : NextResponse.redirect(new URL('/login/admin', request.url));
        response.cookies.delete('pos_token');
        return response;
    }
    
    // Admin-only routes
    if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && payload.role !== 'admin') {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/pos/main', request.url));
    }
    
    // POS routes: only 'user' role
    if (POS_ROUTES.some(r => pathname.startsWith(r)) && payload.role !== 'user') {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg).*)'],
};
