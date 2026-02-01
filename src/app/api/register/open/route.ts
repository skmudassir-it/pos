import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { total, details } = body;

        // Check if already open
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM register_sessions WHERE status = "open" LIMIT 1');
        if (rows.length > 0) {
            return NextResponse.json(
                { success: false, message: 'Register is already open' },
                { status: 400 }
            );
        }

        await pool.query<ResultSetHeader>(
            'INSERT INTO register_sessions (opening_amount, opening_details, status) VALUES (?, ?, ?)',
            [total, JSON.stringify(details), 'open']
        );

        console.log('Register Opened (DB):', { total, timestamp: new Date() });
        return NextResponse.json({ success: true, message: 'Register opened successfully', total });
    } catch (err) {
        console.error('Open register error:', err);
        return NextResponse.json(
            { error: 'Failed to open register' },
            { status: 500 }
        );
    }
}
