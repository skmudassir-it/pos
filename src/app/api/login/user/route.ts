import { NextResponse } from 'next/server';
import pool, { verifyPassword } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { RowDataPacket } from 'mysql2';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;

        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM users WHERE username = ? AND role = ?',
            [username, 'user']
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Invalid user credentials' },
                { status: 401 }
            );
        }

        const user = rows[0];
        const valid = await verifyPassword(password, user.password);
        if (!valid) {
            return NextResponse.json(
                { success: false, message: 'Invalid user credentials' },
                { status: 401 }
            );
        }

        const token = signToken({ id: user.id, username: user.username, role: 'user' });
        const response = NextResponse.json({ success: true, role: 'user', user: { id: user.id, username: user.username, name: user.name } });
        response.cookies.set('pos_token', token, { httpOnly: true, maxAge: 86400, path: '/' });
        return response;
    } catch (err) {
        console.error('User login error:', err);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
