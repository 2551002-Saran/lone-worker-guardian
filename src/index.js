import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import xss from 'xss';
import Database from 'better-sqlite3';

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

// 1. Setup Socket.IO Server for React Frontend
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 2. Setup Persistent SQL Database (SQLite)
const db = new Database('sheshield.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS worker_safety_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workerId TEXT NOT NULL,
    type TEXT NOT NULL,
    lat REAL,
    lng REAL,
    timestamp TEXT
  )
`);

// 3. Security Measure: Rate Limiting (Mitigates DoS / Flood Attacks)
const sosLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit 5 SOS requests per minute
  message: { success: false, error: '🚨 Rate Limit Exceeded: Too many SOS requests!' }
});

// Twilio Setup (Optional Fallback)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const ownerPhone = process.env.OWNER_PHONE_NUMBER;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Real-Time Socket.IO Listener & Broadcaster
io.on('connection', (socket) => {
  console.log(`[WEBSOCKET CONNECTED] ID: ${socket.id}`);

  // Listen for 'worker_sos' emitted by Worker View in App.jsx
  socket.on('worker_sos', async (data) => {
    try {
      // Security Control: Input Sanitization against XSS
      const sanitizedWorkerId = xss(data.workerId || 'WORKER-8042');
      const sanitizedType = xss(data.type || 'MANUAL_SOS');
      const lat = data.location?.lat || 9.146984;
      const lng = data.location?.lng || 77.832288;
      const timestamp = data.timestamp || new Date().toLocaleTimeString();

      // Save to SQL Database
      const stmt = db.prepare(
        'INSERT INTO worker_safety_logs (workerId, type, lat, lng, timestamp) VALUES (?, ?, ?, ?, ?)'
      );
      const result = stmt.run(sanitizedWorkerId, sanitizedType, lat, lng, timestamp);

      const alertPayload = {
        id: result.lastInsertRowid,
        workerId: sanitizedWorkerId,
        type: sanitizedType,
        location: { lat, lng },
        timestamp
      };

      // Broadcast 'owner_alert' live to Owner Dashboard across WebSockets
      io.emit('owner_alert', alertPayload);
      console.log(`[DISPATCHED TO OWNER DASHBOARD]:`, alertPayload);

      // Optional Twilio SMS dispatch
      if (client && twilioPhone && ownerPhone) {
        const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
        await client.messages.create({
          body: `🚨 EMERGENCY LONE WORKER ALERT 🚨\nWorker: ${sanitizedWorkerId}\nType: ${sanitizedType}\nMaps: ${mapsLink}`,
          from: twilioPhone,
          to: ownerPhone
        });
      }
    } catch (err) {
      console.error('Error handling worker_sos event:', err);
    }
  });
});

// Endpoint to fetch persistent SQL logs for initial load
app.get('/api/alerts', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM worker_safety_logs ORDER BY id DESC');
    const logs = stmt.all().map(log => ({
      id: log.id,
      workerId: log.workerId,
      type: log.type,
      location: { lat: log.lat, lng: log.lng },
      timestamp: log.timestamp
    }));
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// HTTP POST SOS route with Rate Limiter
app.post('/api/send-sos', sosLimiter, (req, res) => {
  res.status(200).json({ success: true, message: 'SOS processed' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Lone Worker Guardian Server active on port ${PORT}`));