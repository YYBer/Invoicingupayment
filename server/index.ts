import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import paymentRoutes from './paymentRoutes';
import { paymentService } from './paymentService';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Invoicingu Payment Backend'
  });
});

// Payment API routes
app.use('/api/payment', paymentRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Invoicingu Payment Backend API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      submitPayment: 'POST /api/payment/submit',
      checkStatus: 'GET /api/payment/status/:hash',
      allPayments: 'GET /api/payment/all'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize payment monitoring service
    console.log('Initializing TON Client...');
    await paymentService.initialize();

    // Start cleanup interval (every hour)
    setInterval(() => {
      paymentService.cleanup();
    }, 3600000);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`💰 Payment API: http://localhost:${PORT}/api/payment`);
      console.log(`\nReceiver Address: 0QBFO8ldT9Ia1mboCBlcA5zgR-Op3D4NTO5r8s0yB6jQ92uX`);
      console.log(`Expected Amount: 0.01 TON\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
