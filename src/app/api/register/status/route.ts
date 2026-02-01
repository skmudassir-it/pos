import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM register_sessions WHERE status = "open" ORDER BY opened_at DESC LIMIT 1'
        );
        const isOpen = rows.length > 0;
        return NextResponse.json({ isOpen });
    } catch (err) {
        console.error('Check register status error:', err);
        // Fallback to false if DB fails, or handle appropriately
        return NextResponse.json({ isOpen: false });
    }
}
