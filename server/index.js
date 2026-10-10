import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
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

// 1. Setup Socket.IO Server
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// 2. Setup SQLite Database
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

// 3. Twilio Setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const ownerPhone = process.env.OWNER_PHONE_NUMBER;

const client = (accountSid && authToken && accountSid.startsWith('AC')) 
  ? twilio(accountSid, authToken) 
  : null;

// 4. Nodemailer Email Setup (Optional: Fill in .env to send Emails)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS  // Gmail App Password
  }
});

// Real-Time Socket.IO Handler
io.on('connection', (socket) => {
  console.log(`[WEBSOCKET CONNECTED] ID: ${socket.id}`);

  socket.on('worker_sos', async (data) => {
    console.log('[SOS RECEIVED VIA WEBSOCKET]:', data);

    const sanitizedWorkerId = xss(data.workerId || 'WORKER-8042');
    const sanitizedType = xss(data.type || 'MANUAL_SOS');
    const lat = data.location?.lat || 9.146984;
    const lng = data.location?.lng || 77.832288;
    const timestamp = data.timestamp || new Date().toLocaleTimeString();

    // Insert into SQL DB
    const stmt = db.prepare('INSERT INTO worker_safety_logs (workerId, type, lat, lng, timestamp) VALUES (?, ?, ?, ?, ?)');
    const result = stmt.run(sanitizedWorkerId, sanitizedType, lat, lng, timestamp);

    const alertPayload = {
      id: result.lastInsertRowid,
      workerId: sanitizedWorkerId,
      type: sanitizedType,
      location: { lat, lng },
      timestamp
    };

    // Broadcast to Owner Dashboard
    io.emit('owner_alert', alertPayload);
    console.log('[WEBSOCKET BROADCAST SENT TO OWNER DASHBOARD]');

    const mapsLink = `https://www.google.com/maps?q=${lat},${lng}`;

    // --- SEND TWILIO SMS ---
    if (client) {
      try {
        const message = await client.messages.create({
          body: `🚨 CRITICAL LONE WORKER ALERT 🚨\nWorker: ${sanitizedWorkerId}\nTrigger: ${sanitizedType}\nMaps Pin: ${mapsLink}`,
          from: twilioPhone,
          to: ownerPhone
        });
        console.log(`[SMS DISPATCHED SUCCESSFULLY] SID: ${message.sid}`);
      } catch (smsError) {
        console.error('[TWILIO SMS ERROR]:', smsError.message);
      }
    } else {
      console.log('[TWILIO SKIPPED]: Twilio credentials missing in server/.env file');
    }

    // --- SEND EMAIL ALERT ---
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
          subject: `🚨 EMERGENCY ALERT: ${sanitizedWorkerId}`,
          text: `Worker ${sanitizedWorkerId} triggered an emergency SOS!\n\nType: ${sanitizedType}\nTime: ${timestamp}\nLocation: ${mapsLink}`
        });
        console.log('[EMAIL SENT SUCCESSFULLY]');
      } catch (emailErr) {
        console.error('[EMAIL ERROR]:', emailErr.message);
      }
    }
  });
});

app.get('/api/alerts', (req, res) => {
  const stmt = db.prepare('SELECT * FROM worker_safety_logs ORDER BY id DESC');
  const logs = stmt.all().map(log => ({
    id: log.id,
    workerId: log.workerId,
    type: log.type,
    location: { lat: log.lat, lng: log.lng },
    timestamp: log.timestamp
  }));
  res.status(200).json({ success: true, logs });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`🚀 Lone Worker Guardian Server running on port ${PORT}`));