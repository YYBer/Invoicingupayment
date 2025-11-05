import express, { Request, Response } from 'express';
import { paymentService } from './paymentService';

const router = express.Router();

/**
 * POST /api/payment/submit
 * Submit a transaction hash for monitoring
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { transactionHash } = req.body;

    if (!transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Transaction hash is required'
      });
    }

    // Start monitoring the transaction
    await paymentService.monitorTransaction(transactionHash);

    res.json({
      success: true,
      message: 'Payment monitoring started',
      transactionHash
    });
  } catch (error) {
    console.error('Error submitting payment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/payment/status/:hash
 * Check the status of a payment by transaction hash
 */
router.get('/status/:hash', (req: Request, res: Response) => {
  try {
    const { hash } = req.params;

    const status = paymentService.getPaymentStatus(hash);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      payment: status
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/payment/all
 * Get all payment statuses (for admin/debugging)
 */
router.get('/all', (req: Request, res: Response) => {
  try {
    const payments = paymentService.getAllPaymentStatuses();

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('Error getting all payments:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/payment/webhook
 * Webhook endpoint for receiving payment notifications (optional)
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { transactionHash, status } = req.body;

    console.log('Webhook received:', { transactionHash, status });

    // You can add additional webhook logic here

    res.json({
      success: true,
      message: 'Webhook received'
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;
