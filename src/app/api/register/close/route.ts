import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { closing_amount, closing_details } = body;

        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM register_sessions WHERE status = "open" ORDER BY opened_at DESC LIMIT 1'
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, message: 'No open register session to close' },
                { status: 400 }
            );
        }
        const sessionId = rows[0].id;

        await pool.query<ResultSetHeader>(
            'UPDATE register_sessions SET closing_amount = ?, closing_details = ?, status = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [closing_amount, JSON.stringify(closing_details), 'closed', sessionId]
        );

        console.log('Register Closed (DB):', { sessionId, closing_amount, timestamp: new Date() });
        return NextResponse.json({ success: true, message: 'Register closed successfully' });
    } catch (err) {
        console.error('Close register error:', err);
        return NextResponse.json(
            { error: 'Failed to close register' },
            { status: 500 }
        );
    }
}
