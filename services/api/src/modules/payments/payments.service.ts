import { Injectable, Logger } from '@nestjs/common';
import crypto from 'crypto';
import { PaymentTransaction } from '@parkeazy/shared-types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private transactions: Map<string, PaymentTransaction> = new Map();

  public getPaymentMethods() {
    return [
      { id: 'upi', name: 'UPI (Google Pay, PhonePe, Paytm, BHIM)', icon: 'payments', popular: true },
      { id: 'card', name: 'Credit / Debit Card (Visa, MasterCard, RuPay)', icon: 'credit_card', popular: false },
      { id: 'netbanking', name: 'Net Banking (All Major Indian Banks)', icon: 'account_balance', popular: false },
      { id: 'wallet', name: 'ParkEazy FastPass Wallet', icon: 'account_balance_wallet', popular: false },
    ];
  }

  public async initiatePayment(bookingId: string, method: string, amountInr: number): Promise<PaymentTransaction> {
    const txn: PaymentTransaction = {
      id: crypto.randomUUID(),
      bookingId,
      tenantId: 'default',
      provider: 'razorpay',
      providerOrderId: `order_${crypto.randomUUID().slice(0, 14)}`,
      providerPaymentId: `pay_${crypto.randomUUID().slice(0, 14)}`,
      amountInr,
      currency: 'INR',
      method,
      status: 'captured',
      createdAt: new Date().toISOString(),
    };

    this.transactions.set(txn.id, txn);
    return txn;
  }

  public async verifyPayment(transactionId: string, referenceId: string): Promise<PaymentTransaction> {
    const existing = this.transactions.get(transactionId);
    if (existing) {
      existing.status = 'captured';
      return existing;
    }

    const fallback: PaymentTransaction = {
      id: transactionId,
      bookingId: referenceId,
      tenantId: 'default',
      provider: 'razorpay',
      providerOrderId: `order_${referenceId.slice(0, 10)}`,
      amountInr: 100,
      currency: 'INR',
      status: 'captured',
      createdAt: new Date().toISOString(),
    };
    return fallback;
  }
}
