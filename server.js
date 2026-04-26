// server.js — StockSense AI Backend v2
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const path       = require('path');
const cron       = require('node-cron');
const rateLimit  = require('express-rate-limit');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('io', io);

app.use('/api/', rateLimit({ windowMs: 15*60*1000, max: 500, message: { success:false, message:'Too many requests' } }));

// Static frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// ── API Routes ──────────────────────────────────────────────
app.use('/api/auth',      require('./backend/routes/auth'));
app.use('/api/stock',     require('./backend/routes/stock'));
app.use('/api/sales',     require('./backend/routes/sales'));
app.use('/api/purchases', require('./backend/routes/purchases'));
app.use('/api/reports',   require('./backend/routes/reports'));
app.use('/api/users',     require('./backend/routes/users'));
app.use('/api/business',  require('./backend/routes/business'));
app.use('/api/aitrends',  require('./backend/routes/aitrends'));

app.get('/api/health', (req, res) => res.json({ success:true, message:'StockSense API v2 running', time: new Date() }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));

// ── Socket.IO ────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('disconnect', () => console.log('🔌 Client disconnected:', socket.id));
});

// ── Realtime low-stock broadcast every 30s ───────────────────
const db = require('./backend/config/db');
setInterval(async () => {
    try {
        const [low] = await db.query(`SELECT id, name, qty FROM stock WHERE qty <= low_stock_threshold`);
        io.emit('stock:lowAlert', low);
    } catch(e){}
}, 30000);

// ── Daily Email Cron ─────────────────────────────────────────
const cronExpr = process.env.DAILY_REPORT_CRON || '0 20 * * *';
cron.schedule(cronExpr, async () => {
    console.log('⏰ Sending scheduled daily report...');
    const { sendDailyReport } = require('./backend/utils/mailer');
    await sendDailyReport();
}, { timezone: 'Asia/Kolkata' });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 StockSense AI v2 → http://localhost:${PORT}`);
    console.log(`📅 Daily report cron: ${cronExpr} IST`);
    console.log(`\n  Admin:  admin / password`);
    console.log(`  Staff:  staff / password\n`);
});
