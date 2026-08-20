import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`⚡ Device Connected: ${socket.id}`);

  // Listen for worker SOS and broadcast to all connected owners instantly
  socket.on('worker_sos', (sosData) => {
    console.log('🚨 SOS Event Received:', sosData);
    io.emit('owner_alert', sosData);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Device Disconnected: ${socket.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`🚀 Real-Time Server running on http://localhost:${PORT}`));