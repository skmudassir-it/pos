import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        let query = 'SELECT * FROM transactions WHERE 1=1';
        const params: any[] = [];

        if (startDate) {
            query += ' AND date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND date <= ?';
            // Add time to end date to cover the full day if just date is provided
            const endDateTime = endDate.includes(' ') ? endDate : `${endDate} 23:59:59`;
            params.push(endDateTime);
        }

        query += ' ORDER BY date DESC';

        const [rows] = await pool.query<RowDataPacket[]>(query, params);
        return NextResponse.json({ success: true, data: rows });
    } catch (err) {
        console.error('Analytics Fetch Error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch analytics data' },
            { status: 500 }
        );
    }
}
