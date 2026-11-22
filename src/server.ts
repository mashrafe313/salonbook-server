
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';

import { connectDB } from './config/db';
import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import serviceRoutes from './routes/service.routes';

const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);

// Basic API health check
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'SalonBook API is running',
  });
});

// Database health check
app.get('/api/health/db', async (_req, res) => {
  try {
    const db = await connectDB();
    await db.command({ ping: 1 });

    res.status(200).json({
      success: true,
      message: 'MongoDB connection is working',
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

// Global error handler
const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next
) => {
  console.error('Server error:', error);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

app.use(errorHandler);

// Start server after connecting to MongoDB
async function startServer() {
  try {
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(
        `SalonBook server running at http://localhost:${env.PORT}`
      );
    });
  } catch (error) {
    console.error('Failed to start SalonBook server:', error);
    process.exit(1);
  }
}

void startServer();
