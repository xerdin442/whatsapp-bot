import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Secrets } from '@src/common/secrets';
import { IncomingMessage } from '@src/common/types';

@Injectable()
export class MessageService {
  private readonly httpInstance: AxiosInstance;

  constructor() {
    this.httpInstance = axios.create({
      baseURL: `https://graph.facebook.com/${Secrets.WHATSAPP_API_VERSION}/${Secrets.WHATSAPP_PHONE_NUMBER_ID}/`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Secrets.WHATSAPP_USER_ACCESS_TOKEN}`,
      },
    });
  }

  async markMessageAsRead(messageId: string) {
    try {
      const payload = JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
        typing_indicator: {
          type: 'text',
        },
      });
      await this.httpInstance.post('messages', payload);

      console.log('Previous message marked as read');
      return;
    } catch (error) {
      throw error;
    }
  }

  async handleIncomingMessage(message: IncomingMessage) {
    try {
      const sender = message.from;
      const messageId = message.id;

      if (message.type === 'text') {
        const text = message.text.body;
        const payload = JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sender,
          type: 'text',
          text: {
            preview_url: false,
            body: 'Response from NestJS WhatsApp Bot! You said: ' + text,
          },
        });

        await this.markMessageAsRead(messageId);
        await this.httpInstance.post('messages', payload);

        console.log('Message sent successfully');
        return;
      }
    } catch (error) {
      throw error;
    }
  }
}
