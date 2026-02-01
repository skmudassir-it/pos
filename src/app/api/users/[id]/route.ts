import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { ResultSetHeader } from 'mysql2';

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { username, password, role, name } = body;

        let query = 'UPDATE users SET username = ?, role = ?, name = ?';
        const queryParams: any[] = [username, role, name];

        if (password) {
            query += ', password = ?';
            queryParams.push(password);
        }
        query += ' WHERE id = ?';
        queryParams.push(id);

        await pool.query<ResultSetHeader>(query, queryParams);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Update user error:', err);
        return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [id]);
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Delete user error:', err);
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }
}
