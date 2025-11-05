import { TonClient, Address } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';

// Receiver wallet address
const RECEIVER_ADDRESS = '0QBFO8ldT9Ia1mboCBlcA5zgR-Op3D4NTO5r8s0yB6jQ92uX';
const EXPECTED_AMOUNT = 0.01; // TON amount

interface PaymentStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  amount?: number;
  from?: string;
  to?: string;
  timestamp?: number;
}

class PaymentMonitoringService {
  private tonClient: TonClient | null = null;
  private paymentStatuses: Map<string, PaymentStatus> = new Map();
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  async initialize() {
    try {
      const endpoint = await getHttpEndpoint({ network: 'mainnet' });
      this.tonClient = new TonClient({ endpoint });
      console.log('TON Client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize TON Client:', error);
      throw error;
    }
  }

  /**
   * Start monitoring a transaction by its hash
   */
  async monitorTransaction(txHash: string): Promise<void> {
    if (!this.tonClient) {
      throw new Error('TON Client not initialized');
    }

    // Initialize payment status
    this.paymentStatuses.set(txHash, {
      hash: txHash,
      status: 'pending',
      confirmations: 0
    });

    console.log(`Started monitoring transaction: ${txHash}`);

    // Check transaction status every 5 seconds
    const interval = setInterval(async () => {
      await this.checkTransactionStatus(txHash);
    }, 5000);

    this.monitoringIntervals.set(txHash, interval);

    // Stop monitoring after 10 minutes (timeout)
    setTimeout(() => {
      this.stopMonitoring(txHash);
      const status = this.paymentStatuses.get(txHash);
      if (status && status.status === 'pending') {
        status.status = 'failed';
        console.log(`Transaction ${txHash} timed out`);
      }
    }, 600000); // 10 minutes
  }

  /**
   * Check the status of a transaction
   */
  private async checkTransactionStatus(txHash: string): Promise<void> {
    if (!this.tonClient) return;

    try {
      const receiverAddress = Address.parse(RECEIVER_ADDRESS);

      // Get recent transactions for the receiver address
      const transactions = await this.tonClient.getTransactions(receiverAddress, {
        limit: 20
      });

      // Look for matching transaction
      for (const tx of transactions) {
        const txHashStr = tx.hash().toString('base64');

        if (txHashStr === txHash || this.normalizeHash(txHashStr) === this.normalizeHash(txHash)) {
          // Found the transaction
          const inMsg = tx.inMessage;

          if (inMsg && inMsg.info.type === 'internal') {
            const amount = Number(inMsg.info.value.coins) / 1e9; // Convert from nanotons
            const fromAddress = inMsg.info.src?.toString();

            const currentStatus = this.paymentStatuses.get(txHash);

            if (currentStatus) {
              // Verify amount matches expected
              if (Math.abs(amount - EXPECTED_AMOUNT) < 0.001) { // Allow small variance
                currentStatus.status = 'confirmed';
                currentStatus.amount = amount;
                currentStatus.from = fromAddress;
                currentStatus.to = RECEIVER_ADDRESS;
                currentStatus.timestamp = tx.now;
                currentStatus.confirmations = 1;

                console.log(`Transaction ${txHash} confirmed! Amount: ${amount} TON`);

                // Stop monitoring once confirmed
                this.stopMonitoring(txHash);
              } else {
                console.warn(`Transaction amount mismatch. Expected: ${EXPECTED_AMOUNT}, Got: ${amount}`);
                currentStatus.status = 'failed';
                this.stopMonitoring(txHash);
              }
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error(`Error checking transaction ${txHash}:`, error);
    }
  }

  /**
   * Normalize transaction hash for comparison
   */
  private normalizeHash(hash: string): string {
    return hash.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  }

  /**
   * Stop monitoring a transaction
   */
  private stopMonitoring(txHash: string): void {
    const interval = this.monitoringIntervals.get(txHash);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(txHash);
      console.log(`Stopped monitoring transaction: ${txHash}`);
    }
  }

  /**
   * Get payment status by transaction hash
   */
  getPaymentStatus(txHash: string): PaymentStatus | null {
    return this.paymentStatuses.get(txHash) || null;
  }

  /**
   * Get all payment statuses
   */
  getAllPaymentStatuses(): PaymentStatus[] {
    return Array.from(this.paymentStatuses.values());
  }

  /**
   * Clean up completed/failed transactions older than 1 hour
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 3600000;

    for (const [hash, status] of this.paymentStatuses.entries()) {
      if (status.status !== 'pending' && status.timestamp && status.timestamp < oneHourAgo) {
        this.paymentStatuses.delete(hash);
        console.log(`Cleaned up old transaction: ${hash}`);
      }
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentMonitoringService();
export type { PaymentStatus };
