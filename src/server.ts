
import 'dotenv/config';

import express from 'express';
import cors from 'cors';

const app = express();

const PORT = Number(process.env.PORT || 5000);
const CLIENT_URL =
  process.env.CLIENT_URL || 'http://localhost:3000';

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// API health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'SalonBook API is running',
  });
});

app.listen(PORT, () => {
  console.log(`SalonBook server running on port ${PORT}`);
});
