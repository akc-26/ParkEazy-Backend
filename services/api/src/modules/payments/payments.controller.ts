import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Get('methods')
  public getMethods() {
    return {
      success: true,
      data: this.paymentsService.getPaymentMethods(),
    };
  }

  @Post('initiate')
  public async initiate(@Body() body: { bookingId: string; method: string; amountInr: number }) {
    const data = await this.paymentsService.initiatePayment(body.bookingId, body.method, body.amountInr);
    return { success: true, data };
  }

  @Post('verify')
  public async verify(@Body() body: { transactionId: string; referenceId: string }) {
    const data = await this.paymentsService.verifyPayment(body.transactionId, body.referenceId);
    return { success: true, data };
  }
}
