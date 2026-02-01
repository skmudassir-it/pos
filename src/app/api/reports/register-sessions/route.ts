import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        let query = 'SELECT * FROM register_sessions WHERE 1=1';
        const params: any[] = [];

        if (startDate) {
            query += ' AND opened_at >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND opened_at <= ?';
            const endDateTime = endDate.includes(' ') ? endDate : `${endDate} 23:59:59`;
            params.push(endDateTime);
        }

        query += ' ORDER BY opened_at DESC';

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        return NextResponse.json({ success: true, data: rows });
    } catch (err) {
        console.error('Reports Fetch Error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch register sessions' },
            { status: 500 }
        );
    }
}
