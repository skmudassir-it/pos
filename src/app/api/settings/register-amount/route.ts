import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT setting_value FROM settings WHERE setting_key = ?',
            ['register_initial_amount']
        );
        const amount = rows[0]?.setting_value || '0';
        return NextResponse.json({ amount: parseFloat(amount) });
    } catch (err) {
        console.error('Fetch register amount error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch register amount' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { amount } = body;

        await pool.query<ResultSetHeader>(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['register_initial_amount', amount.toString(), amount.toString()]
        );
        return NextResponse.json({ success: true, amount });
    } catch (err) {
        console.error('Update register amount error:', err);
        return NextResponse.json(
            { error: 'Failed to update register amount' },
            { status: 500 }
        );
    }
}
