import express from 'express';
import cors from 'cors';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Twilio Setup (Replace credentials in .env file)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const ownerPhone = process.env.OWNER_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

// SOS Alert Endpoint
app.post('/api/send-sos', async (req, res) => {
  const { workerId, location, triggerType } = req.body;

  const mapsLink = location 
    ? `https://www.google.com/maps?q=${location.lat},${location.lng}` 
    : 'Location Unavailable';

  const messageBody = `🚨 CRITICAL LONE WORKER ALERT 🚨\nWorker: ${workerId}\nTrigger: ${triggerType}\nMaps Pin: ${mapsLink}`;

  try {
    // Send SMS directly to Owner's Mobile Phone
    const message = await client.messages.create({
      body: messageBody,
      from: twilioPhone,
      to: ownerPhone
    });

    console.log(`[SMS DISPATCHED] SID: ${message.sid}`);
    res.status(200).json({ success: true, messageSid: message.sid });
  } catch (error) {
    console.error('Failed to send SMS alert:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));