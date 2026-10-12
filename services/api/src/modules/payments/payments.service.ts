import { Injectable, ServiceUnavailableException, NotFoundException } from '@nestjs/common';
import { PaymentTransaction } from '@parkeazy/shared-types';

/**
 * Payment-provider boundary. Part 07 must never simulate a captured payment.
 * The real provider adapter and webhook verification are part of Part 08.
 */
@Injectable()
export class PaymentsService {
  public getPaymentMethods() {
    return [
      { id: 'upi', name: 'UPI (Google Pay, PhonePe, Paytm, BHIM)', icon: 'payments', popular: true },
      { id: 'card', name: 'Credit / Debit Card (Visa, MasterCard, RuPay)', icon: 'credit_card', popular: false },
      { id: 'netbanking', name: 'Net Banking (All Major Indian Banks)', icon: 'account_balance', popular: false },
      { id: 'wallet', name: 'ParkEazy FastPass Wallet', icon: 'account_balance_wallet', popular: false },
    ];
  }

  public async initiatePayment(_bookingId: string, _method: string, _amountInr: number): Promise<PaymentTransaction> {
    throw new ServiceUnavailableException('Payment processing is not configured. No payment was initiated or captured. Complete Part 08 provider integration before enabling checkout.');
  }

  public async verifyPayment(_transactionId: string, _referenceId: string): Promise<PaymentTransaction> {
    throw new NotFoundException('No verified payment transaction exists. Payment verification must use an authenticated provider callback.');
  }
}
