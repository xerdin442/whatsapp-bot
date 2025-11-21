import { Process, Processor } from '@nestjs/bull';
import { Inject } from '@nestjs/common';
import logger from '@src/common/logger';
import { Secrets } from '@src/common/secrets';
import {
  ConversationContext,
  MessageReplyPayload,
  PaymentWebhookPayload,
} from '@src/common/types';
import { GeminiService } from '@src/gemini/gemini.service';
import { REDIS_CLIENT } from '@src/redis/redis.module';
import axios from 'axios';
import { Job } from 'bull';
import { RedisClientType } from 'redis';

@Processor('payments-queue')
export class PaymentsProcessor {
  private readonly context: string = PaymentsProcessor.name;

  constructor(
    private readonly gemini: GeminiService,
    @Inject(REDIS_CLIENT) private readonly redis: RedisClientType,
  ) {}

  @Process('webhook')
  async handlePaymentWebhook(job: Job<PaymentWebhookPayload>) {
    try {
      const { status, phoneId, email, reason, reference } = job.data;

      // Update conversation history with payment status
      const functionResult = { status, email, reason };
      const paymentContext: ConversationContext = {
        content: {
          role: 'function',
          parts: [
            {
              functionResponse: {
                name: 'initiate_ticket_purchase',
                response: { functionResult },
              },
            },
          ],
        },
        currentState: 'completed',
      };
      await this.gemini.updateChatHistory(phoneId, paymentContext);

      // Fetch current conversation history
      const chatHistory = await this.gemini.getChatHistory(phoneId);
      const contentsFromHistory = chatHistory.map((chat) => chat.content);

      // Generate response from model
      const response =
        await this.gemini.generateModelResponse(contentsFromHistory);

      // Send response to user
      const payload: MessageReplyPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneId,
        type: 'text',
        text: {
          preview_url: false,
          body: response.text || 'Payment completed successfully!',
        },
      };

      await axios.post(
        `${Secrets.WHATSAPP_MESSAGING_API_URL}messages`,
        JSON.stringify(payload),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Secrets.WHATSAPP_USER_ACCESS_TOKEN}`,
          },
        },
      );

      // Store notification ID in Redis to prevent duplicate processing
      const cacheKey = `payment_notification:${reference}`;
      await this.redis.setEx(cacheKey, 24 * 3600, reference);

      return;
    } catch (error) {
      logger.error(
        `[${this.context}] Error processing webhook notification. Error: ${error.message}`,
      );

      throw error;
    }
  }
}
