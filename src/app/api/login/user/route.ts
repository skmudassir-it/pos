import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;

        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM users WHERE username = ? AND password = ? AND role = ?',
            [username, password, 'user']
        );

        if (rows.length > 0) {
            return NextResponse.json({ success: true, role: 'user', user: rows[0] });
        } else {
            return NextResponse.json(
                { success: false, message: 'Invalid user credentials' },
                { status: 401 }
            );
        }
    } catch (err) {
        console.error('User login error:', err);
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        );
    }
}
