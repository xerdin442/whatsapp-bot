import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { WebhookRequest } from '@src/common/types';
import { Request } from 'express';
import { MessageService } from './message.service';
import { Secrets } from '@src/common/secrets';

@Controller('message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get('webhook')
  verifyWebhook(@Req() req: Request): string {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'] as string;

    if (mode && token) {
      if (
        mode === 'subscribe' &&
        token === Secrets.WHATSAPP_WEBHOOK_VERIFICATION_TOKEN
      ) {
        console.log('Webhook verification successful!');
        return challenge;
      } else {
        return 'Invalid verification token';
      }
    } else {
      return 'Error verifying token';
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async handleIncomingMessage(@Req() req: WebhookRequest) {
    try {
      const entry = req.body.entry?.[0];
      if (!entry) return;

      if (entry.id !== Secrets.WHATSAPP_BUSINESS_ACCOUNT_ID) return;

      const changes = entry.changes?.[0];
      if (!changes) return;

      const value = changes.value;
      if (!value) return;

      const messages = value.messages;
      if (!messages || messages.length === 0) return;

      const message = messages[0];
      if (!message) return;

      await this.messageService.handleIncomingMessage(message);
    } catch (error) {
      throw error;
    }
  }
}
