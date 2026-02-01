import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await pool.query<ResultSetHeader>('DELETE FROM products WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete product error:', err);
        return NextResponse.json(
            { error: 'Failed to delete product' },
            { status: 500 }
        );
    }
}
