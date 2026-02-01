import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export async function GET() {
    try {
        const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM products');
        return NextResponse.json(rows);
    } catch (err) {
        console.error('Fetch products error:', err);
        return NextResponse.json(
            { error: 'Failed to fetch products' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, price } = body;

        const [result] = await pool.query<ResultSetHeader>(
            'INSERT INTO products (name, price) VALUES (?, ?)',
            [name, price]
        );
        const newProduct = { id: result.insertId, name, price: parseFloat(price) };
        return NextResponse.json({ success: true, product: newProduct });
    } catch (err) {
        console.error('Add product error:', err);
        return NextResponse.json(
            { error: 'Failed to add product' },
            { status: 500 }
        );
    }
}
