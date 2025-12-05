import { InjectQueue } from '@nestjs/bull';
import {
  ClassSerializerInterceptor,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import logger from '@src/common/logger';
import { Secrets } from '@src/common/secrets';
import { REDIS_CLIENT } from '@src/redis/redis.module';
import { Queue } from 'bull';
import { createHmac } from 'crypto';
import { Request, Response } from 'express';
import { RedisClientType } from 'redis';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('payments')
export class PaymentsController {
  private readonly context: string = PaymentsController.name;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
    @InjectQueue('payments-queue') private readonly paymentsQueue: Queue,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('callback')
  async checkPaymentStatus(@Req() req: Request, @Res() res: Response) {
    try {
      const signature = createHmac('sha256', Secrets.BACKEND_SERVICE_API_KEY)
        .update(JSON.stringify(req.body.reference))
        .digest('hex');
      const receivedSignature = req.headers['x-webhook-signature'];

      if (!receivedSignature) {
        logger.warn(
          `[${this.context}] Payment notification missing signature header.`,
        );
        return;
      }

      if (signature !== (receivedSignature as string)) {
        logger.warn(
          `[${this.context}] Payment notification signature mismatch.`,
        );
        return;
      }

      // Verify notification ID to ensure idempotent procssing
      const cacheKey = `whatsapp_bot:payment_notification:${req.body.reference}`;
      const cacheResult = await this.redis.get(cacheKey);

      if (cacheResult) {
        logger.warn(
          `[${this.context}] Duplicate payment notification received. Webhook reference: ${req.body.reference}`,
        );

        return;
      }

      // Process payment notification
      await this.paymentsQueue.add('webhook', req.body);

      // Send 200 OK response to backend service to confirm receipt of webhook
      res.status(200).send('Payment notification processed');
      return;
    } catch (error) {
      logger.error(
        `[${this.context}] Error processing payment notification: ${error.message}`,
      );

      throw error;
    }
  }
}
