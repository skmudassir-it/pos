import express, { Request, Response } from 'express';
import next from 'next';
import { parse } from 'url';
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const port = process.env.PORT || 3000;


app.prepare().then(() => {
    const server = express();
    server.use(express.json());

    // Database Connection
    const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
    const db = pool.promise();

    // Initialize Tables
    const initDb = async () => {
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    price DECIMAL(10,2) NOT NULL
                )
            `);
            await db.query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    receipt_no VARCHAR(50) NOT NULL,
                    date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    qty INT NOT NULL,
                    total DECIMAL(10,2) NOT NULL,
                    method VARCHAR(10) NOT NULL,
                    items JSON
                )
            `);
            await db.query(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    receipt_no VARCHAR(50) NOT NULL,
                    date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    qty INT NOT NULL,
                    total DECIMAL(10,2) NOT NULL,
                    subtotal DECIMAL(10,2) DEFAULT 0,
                    tax DECIMAL(10,2) DEFAULT 0,
                    method VARCHAR(10) NOT NULL,
                    items JSON
                )
            `);

            await db.query(`
                CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(50) PRIMARY KEY,
                    setting_value VARCHAR(255)
                )
            `);

            // Migration for existing tables
            try {
                await db.query("ALTER TABLE transactions ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0");
            } catch (e) { /* Ignore if exists */ }
            try {
                await db.query("ALTER TABLE transactions ADD COLUMN tax DECIMAL(10,2) DEFAULT 0");
            } catch (e) { /* Ignore if exists */ }

            console.log('Database initialized');
        } catch (err) {
            console.error('Database initialization failed:', err);
        }
    };
    initDb();

    // In-memory state for keeping track of register status
    let isRegisterOpen = false;

    // Login APIs
    server.post('/api/login/admin', (req: Request, res: Response) => {
        const { username, password } = req.body;
        if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
            res.json({ success: true, role: 'admin' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }
    });

    server.post('/api/login/user', (req: Request, res: Response) => {
        const { username, password } = req.body;
        if (username === process.env.USER_USER && password === process.env.USER_PASS) {
            res.json({ success: true, role: 'user' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid user credentials' });
        }
    });

    // Register APIs
    server.get('/api/register/status', (req: Request, res: Response) => {
        res.json({ isOpen: isRegisterOpen });
    });

    server.post('/api/register/open', (req: Request, res: Response) => {
        const { total, details } = req.body;
        isRegisterOpen = true; // Still in-memory for session status
        console.log('Register Opened:', { total, details, timestamp: new Date() });
        res.json({ success: true, message: 'Register opened successfully', total });
    });

    server.post('/api/register/close', (req: Request, res: Response) => {
        isRegisterOpen = false;
        console.log('Register Closed:', { timestamp: new Date() });
        res.json({ success: true, message: 'Register closed successfully' });
    });

    // Product APIs (DB)
    server.get('/api/products', async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query('SELECT * FROM products');
            res.json(rows);
        } catch (err) {
            console.error('Fetch products error:', err);
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    });

    server.post('/api/products', async (req: Request, res: Response) => {
        const { name, price } = req.body;
        try {
            const [result] = await db.query('INSERT INTO products (name, price) VALUES (?, ?)', [name, price]);
            const newProduct = { id: (result as any).insertId, name, price: parseFloat(price) };
            res.json({ success: true, product: newProduct });
        } catch (err) {
            console.error('Add product error:', err);
            res.status(500).json({ error: 'Failed to add product' });
        }
    });

    server.delete('/api/products/:id', async (req: Request, res: Response) => {
        const id = req.params.id;
        try {
            await db.query('DELETE FROM products WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Delete product error:', err);
            res.status(500).json({ error: 'Failed to delete product' });
        }
    });

    // Settings APIs
    server.get('/api/settings/tax', async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['tax_rate']);
            const rate = (rows as any[])[0]?.setting_value || '0';
            res.json({ rate: parseFloat(rate) });
        } catch (err) {
            console.error('Fetch tax rate error:', err);
            res.status(500).json({ error: 'Failed to fetch tax rate' });
        }
    });

    server.post('/api/settings/tax', async (req: Request, res: Response) => {
        const { rate } = req.body;
        try {
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['tax_rate', rate.toString(), rate.toString()]
            );
            res.json({ success: true, rate });
        } catch (err) {
            console.error('Update tax rate error:', err);
            res.status(500).json({ error: 'Failed to update tax rate' });
        }
    });

    // Sales APIs (DB)
    server.post('/api/transactions', async (req: Request, res: Response) => {
        const { receiptNo, date, qty, total, subtotal, tax, method, items } = req.body;
        const rNo = receiptNo || `REC-${Date.now()}`;
        const d = date ? new Date(date) : new Date();

        try {
            const [result] = await db.query(
                'INSERT INTO transactions (receipt_no, date, qty, total, subtotal, tax, method, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [rNo, d, qty, total, subtotal || total, tax || 0, method, JSON.stringify(items)]
            );
            const transaction = { id: (result as any).insertId, receiptNo: rNo, date: d, qty, total, subtotal, tax, method, items };
            res.json({ success: true, transaction });
        } catch (err) {
            console.error('Record transaction error:', err);
            res.status(500).json({ error: 'Failed to record transaction' });
        }
    });

    server.get('/api/transactions', async (req: Request, res: Response) => {
        const { from, to } = req.query;
        try {
            let query = 'SELECT * FROM transactions';
            const params: any[] = [];

            if (from && to) {
                query += ' WHERE date >= ? AND date <= ?';
                const fromDate = new Date(from as string);
                const toDate = new Date(to as string);
                toDate.setHours(23, 59, 59, 999);
                params.push(fromDate, toDate);
            }
            query += ' ORDER BY date DESC';

            const [rows] = await db.query(query, params);
            // Map keys back to frontend expected format
            const transactions = (rows as any[]).map(row => ({
                id: row.id,
                receiptNo: row.receipt_no,
                date: row.date,
                qty: row.qty,
                total: row.total,
                subtotal: row.subtotal,
                tax: row.tax,
                method: row.method,
                items: row.items // mysql2 parsing JSON automatically? usually returns object if column type is JSON
            }));
            res.json({ transactions });
        } catch (err) {
            console.error('Fetch transactions error:', err);
            res.status(500).json({ error: 'Failed to fetch transactions' });
        }
    });

    // Custom Express middleware or routes can go here
    server.get('/api/hello-express', (req: Request, res: Response) => {
        res.json({ message: 'Hello from Express!' });
    });

    // Handle all other routes with Next.js
    server.all(/(.*)/, (req: Request, res: Response) => {
        return handle(req, res);
    });

    server.listen(port, (err?: any) => {
        if (err) throw err;
        console.log(`> Ready on http://localhost:${port}`);
    });
});
