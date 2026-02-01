import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    try {
        let query = 'SELECT * FROM transactions';
        const params: any[] = [];

        if (from && to) {
            query += ' WHERE date >= ? AND date <= ?';
            const fromDate = new Date(from);
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            params.push(fromDate, toDate);
        }
        query += ' ORDER BY date DESC';

        const [rows] = await pool.query<RowDataPacket[]>(query, params);

        const transactions = rows.map(row => ({
            id: row.id,
            receiptNo: row.receipt_no,
            date: row.date,
            qty: row.qty,
            total: row.total,
            subtotal: row.subtotal,
            tax: row.tax,
            method: row.method,
            items: row.items
        }));

        return NextResponse.json({ transactions });
    } catch (err) {
        console.error('Fetch transactions error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { receiptNo, date, qty, total, subtotal, tax, method, items } = body;

        const rNo = receiptNo || `REC-${Date.now()}`;
        const d = date ? new Date(date) : new Date();

        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO transactions (receipt_no, date, qty, total, subtotal, tax, method, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [rNo, d, qty, total, subtotal || total, tax || 0, method, JSON.stringify(items)]
        );

        const transaction = {
            id: result.insertId,
            receiptNo: rNo,
            date: d,
            qty,
            total,
            subtotal,
            tax,
            method,
            items
        };
        return NextResponse.json({ success: true, transaction });
    } catch (err) {
        console.error('Record transaction error:', err);
        return NextResponse.json(
            { error: 'Failed to record transaction' },
            { status: 500 }
        );
    }
}
