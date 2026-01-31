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
                CREATE TABLE IF NOT EXISTS settings (
                    setting_key VARCHAR(50) PRIMARY KEY,
                    setting_value VARCHAR(255)
                )
            `);

            await db.query(`
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
                    name VARCHAR(100)
                )
            `);

            await db.query(`
                CREATE TABLE IF NOT EXISTS register_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    closed_at DATETIME,
                    opening_amount DECIMAL(10,2) NOT NULL,
                    closing_amount DECIMAL(10,2),
                    opening_details JSON,
                    closing_details JSON,
                    status ENUM('open', 'closed') DEFAULT 'open'
                )
            `);

            // Seed initial admin user if table is empty
            const [users] = await db.query('SELECT count(*) as count FROM users');
            if ((users as any[])[0].count === 0) {
                const adminUser = process.env.ADMIN_USER || 'admin';
                const adminPass = process.env.ADMIN_PASS || 'admin123';
                await db.query('INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
                    [adminUser, adminPass, 'admin', 'Administrator']);
                console.log('Admin user seeded');
            }

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
    // Login APIs (DB)
    server.post('/api/login/admin', async (req: Request, res: Response) => {
        const { username, password } = req.body;
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?', [username, password, 'admin']);
            if ((rows as any[]).length > 0) {
                res.json({ success: true, role: 'admin', user: (rows as any[])[0] });
            } else {
                res.status(401).json({ success: false, message: 'Invalid admin credentials' });
            }
        } catch (err) {
            console.error('Admin login error:', err);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    server.post('/api/login/user', async (req: Request, res: Response) => {
        const { username, password } = req.body;
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?', [username, password, 'user']);
            if ((rows as any[]).length > 0) {
                res.json({ success: true, role: 'user', user: (rows as any[])[0] });
            } else {
                res.status(401).json({ success: false, message: 'Invalid user credentials' });
            }
        } catch (err) {
            console.error('User login error:', err);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    // Register APIs
    server.get('/api/register/status', async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query('SELECT * FROM register_sessions WHERE status = "open" ORDER BY opened_at DESC LIMIT 1');
            const isOpen = (rows as any[]).length > 0;
            res.json({ isOpen });
        } catch (err) {
            console.error('Check register status error:', err);
            // Fallback to false if DB fails, or handle appropriately
            res.json({ isOpen: false });
        }
    });

    server.get('/api/register/current', async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query('SELECT * FROM register_sessions WHERE status = "open" ORDER BY opened_at DESC LIMIT 1');
            if ((rows as any[]).length > 0) {
                const session = (rows as any[])[0];

                // Calculate total sales for this session
                const [salesRows] = await db.query(
                    'SELECT SUM(total) as total_sales FROM transactions WHERE date >= ?',
                    [session.opened_at]
                );
                const totalSales = (salesRows as any[])[0]?.total_sales || 0;

                res.json({ success: true, session, session_sales: parseFloat(totalSales) });
            } else {
                res.status(404).json({ success: false, message: 'No open register session found' });
            }
        } catch (err) {
            console.error('Fetch current register error:', err);
            res.status(500).json({ error: 'Failed to fetch current register' });
        }
    });

    server.post('/api/register/open', async (req: Request, res: Response) => {
        const { total, details } = req.body;
        try {
            // Check if already open
            const [rows] = await db.query('SELECT * FROM register_sessions WHERE status = "open" LIMIT 1');
            if ((rows as any[]).length > 0) {
                return res.status(400).json({ success: false, message: 'Register is already open' });
            }

            await db.query(
                'INSERT INTO register_sessions (opening_amount, opening_details, status) VALUES (?, ?, ?)',
                [total, JSON.stringify(details), 'open']
            );
            isRegisterOpen = true; // Keep for now for legacy compatibility if needed, but rely on DB
            console.log('Register Opened (DB):', { total, timestamp: new Date() });
            res.json({ success: true, message: 'Register opened successfully', total });
        } catch (err) {
            console.error('Open register error:', err);
            res.status(500).json({ error: 'Failed to open register' });
        }
    });

    server.post('/api/register/close', async (req: Request, res: Response) => {
        const { closing_amount, closing_details } = req.body;
        try {
            const [rows] = await db.query('SELECT id FROM register_sessions WHERE status = "open" ORDER BY opened_at DESC LIMIT 1');
            if ((rows as any[]).length === 0) {
                return res.status(400).json({ success: false, message: 'No open register session to close' });
            }
            const sessionId = (rows as any[])[0].id;

            await db.query(
                'UPDATE register_sessions SET closing_amount = ?, closing_details = ?, status = ?, closed_at = CURRENT_TIMESTAMP WHERE id = ?',
                [closing_amount, JSON.stringify(closing_details), 'closed', sessionId]
            );

            isRegisterOpen = false;
            console.log('Register Closed (DB):', { sessionId, closing_amount, timestamp: new Date() });
            res.json({ success: true, message: 'Register closed successfully' });
        } catch (err) {
            console.error('Close register error:', err);
            res.status(500).json({ error: 'Failed to close register' });
        }
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

    server.get('/api/settings/register-amount', async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['register_initial_amount']);
            const amount = (rows as any[])[0]?.setting_value || '0';
            res.json({ amount: parseFloat(amount) });
        } catch (err) {
            console.error('Fetch register amount error:', err);
            res.status(500).json({ error: 'Failed to fetch register amount' });
        }
    });

    server.post('/api/settings/register-amount', async (req: Request, res: Response) => {
        const { amount } = req.body;
        try {
            await db.query(
                'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                ['register_initial_amount', amount.toString(), amount.toString()]
            );
            res.json({ success: true, amount });
        } catch (err) {
            console.error('Update register amount error:', err);
            res.status(500).json({ error: 'Failed to update register amount' });
        }
    });

    // Analytics APIs
    server.get('/api/analytics/sales', async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;
        try {
            let query = 'SELECT * FROM transactions WHERE 1=1';
            const params: any[] = [];

            if (startDate) {
                query += ' AND date >= ?';
                params.push(startDate); // Expecting YYYY-MM-DD or datetime
            }
            if (endDate) {
                query += ' AND date <= ?';
                // Add time to end date to cover the full day if just date is provided
                const endDateTime = (endDate as string).includes(' ') ? endDate : `${endDate} 23:59:59`;
                params.push(endDateTime);
            }

            query += ' ORDER BY date DESC';

            const [rows] = await db.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Analytics Fetch Error:', err);
            res.status(500).json({ error: 'Failed to fetch analytics data' });
        }
    });

    // Reports APIs
    server.get('/api/reports/register-sessions', async (req: Request, res: Response) => {
        const { startDate, endDate } = req.query;
        try {
            let query = 'SELECT * FROM register_sessions WHERE 1=1';
            const params: any[] = [];

            if (startDate) {
                query += ' AND opened_at >= ?';
                params.push(startDate);
            }
            if (endDate) {
                query += ' AND opened_at <= ?';
                const endDateTime = (endDate as string).includes(' ') ? endDate : `${endDate} 23:59:59`;
                params.push(endDateTime);
            }

            query += ' ORDER BY opened_at DESC';

            const [rows] = await db.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error('Reports Fetch Error:', err);
            res.status(500).json({ error: 'Failed to fetch register sessions' });
        }
    });

    // User Management APIs
    server.get('/api/users', async (req: Request, res: Response) => {
        try {
            const [rows] = await db.query('SELECT id, username, role, name FROM users');
            res.json(rows);
        } catch (err) {
            console.error('Fetch users error:', err);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    });

    server.post('/api/users', async (req: Request, res: Response) => {
        const { username, password, role, name } = req.body;
        try {
            const [result] = await db.query(
                'INSERT INTO users (username, password, role, name) VALUES (?, ?, ?, ?)',
                [username, password, role, name]
            );
            res.json({ success: true, id: (result as any).insertId });
        } catch (err) {
            console.error('Create user error:', err);
            res.status(500).json({ error: 'Failed to create user' });
        }
    });

    server.put('/api/users/:id', async (req: Request, res: Response) => {
        const { id } = req.params;
        const { username, password, role, name } = req.body;
        try {
            let query = 'UPDATE users SET username = ?, role = ?, name = ?';
            const params = [username, role, name];
            if (password) {
                query += ', password = ?';
                params.push(password);
            }
            query += ' WHERE id = ?';
            params.push(id);

            await db.query(query, params);
            res.json({ success: true });
        } catch (err) {
            console.error('Update user error:', err);
            res.status(500).json({ error: 'Failed to update user' });
        }
    });

    server.delete('/api/users/:id', async (req: Request, res: Response) => {
        const { id } = req.params;
        try {
            await db.query('DELETE FROM users WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Delete user error:', err);
            res.status(500).json({ error: 'Failed to delete user' });
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
