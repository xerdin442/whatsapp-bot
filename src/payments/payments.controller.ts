import { InjectQueue } from '@nestjs/bull';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import logger from '@src/common/logger';
import { Secrets } from '@src/common/secrets';
import { Queue } from 'bull';
import { createHmac } from 'crypto';
import { Request, Response } from 'express';

@Controller('payments')
export class PaymentsController {
  constructor(
    @InjectQueue('payments-queue') private readonly paymentsQueue: Queue,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('payments/callback')
  async checkPaymentStatus(@Req() req: Request, @Res() res: Response) {
    try {
      const signature = createHmac('sha256', Secrets.BACKEND_SERVICE_API_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');
      const receivedSignature = req.headers['x-webhook-signature'];

      if (!receivedSignature) {
        logger.warn(`Payment notification missing signature header.`);
        return;
      }

      if (signature !== (receivedSignature as string)) {
        logger.warn(`Payment notification signature mismatch.`);
        return;
      }

      // Verify notification ID to ensure idempotent procssing (redis store for 24hrs)

      // Process payment notification
      await this.paymentsQueue.add('webhook', req.body);

      // Send 200 OK response to backend service to confirm receipt of webhook
      res.status(200).send('Payment notification processed');
      return;
    } catch (error) {
      logger.error(`Error processing payment notification: ${error.message}`);
      throw error;
    }
  }
}
