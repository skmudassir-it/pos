import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM register_sessions WHERE status = "open" ORDER BY opened_at DESC LIMIT 1'
        );

        if (rows.length > 0) {
            const session = rows[0];

            // Calculate total sales for this session
            const [salesRows] = await pool.query<RowDataPacket[]>(
                'SELECT SUM(total) as total_sales FROM transactions WHERE date >= ?',
                [session.opened_at]
            );
            const totalSales = salesRows[0]?.total_sales || 0;

            return NextResponse.json({ success: true, session, session_sales: parseFloat(totalSales) });
        } else {
            return NextResponse.json(
                { success: false, message: 'No open register session found' },
                { status: 404 }
            );
        }
    } catch (err) {
        console.error('Fetch current register error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch current register' },
            { status: 500 }
        );
    }
}
