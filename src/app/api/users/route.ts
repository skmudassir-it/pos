import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT id, username, role, name FROM users');
        return NextResponse.json(rows);
    } catch (err) {
        console.error('Fetch users error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password, role, name } = body;

        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
            [username, password, role, name]
        );
        return NextResponse.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Create user error:', err);
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}
