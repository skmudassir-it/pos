import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT setting_value FROM settings WHERE setting_key = ?',
            ['tax_rate']
        );
        const rate = rows[0]?.setting_value || '0';
        return NextResponse.json({ rate: parseFloat(rate) });
    } catch (err) {
        console.error('Fetch tax rate error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch tax rate' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { rate } = body;

        await pool.query<ResultSetHeader>(
            'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
            ['tax_rate', rate.toString(), rate.toString()]
        );
        return NextResponse.json({ success: true, rate });
    } catch (err) {
        console.error('Update tax rate error:', err);
        return NextResponse.json(
            { error: 'Failed to update tax rate' },
            { status: 500 }
        );
    }
}
