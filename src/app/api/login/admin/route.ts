import { NextResponse } from 'next/server';
import pool, { verifyPassword, hashPassword } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

async function autoMigratePassword(userId: number, plainPassword: string, storedPassword: string): Promise<boolean> {
    // Try bcrypt first
    const bcryptValid = await verifyPassword(plainPassword, storedPassword);
    if (bcryptValid) return true;

    // Fallback: plaintext comparison for legacy passwords
    if (plainPassword === storedPassword) {
        // Auto-upgrade to bcrypt
        const hashed = await hashPassword(plainPassword);
        await pool.query<ResultSetHeader>(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashed, userId]
        );
        console.log(`Auto-migrated password for user #${userId}`);
        return true;
    }

    return false;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { username, password } = body;

        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM users WHERE username = ? AND role = ?',
            [username, 'admin']
        );

        if (rows.length === 0) {
            return NextResponse.json(
                { success: false, message: 'Invalid admin credentials' },
                { status: 401 }
            );
        }

        const user = rows[0];
        const valid = await autoMigratePassword(user.id, password, user.password);
        if (!valid) {
            return NextResponse.json(
                { success: false, message: 'Invalid admin credentials' },
                { status: 401 }
            );
        }

        const token = signToken({ id: user.id, username: user.username, role: 'admin' });
        const response = NextResponse.json({ success: true, role: 'admin', user: { id: user.id, username: user.username, name: user.name } });
        response.cookies.set('pos_token', token, { httpOnly: true, maxAge: 86400, path: '/' });
        return response;
    } catch (err) {
        console.error('Admin login error:', err);
        return NextResponse.json({ error: 'Login failed' }, { status: 500 });
    }
}
