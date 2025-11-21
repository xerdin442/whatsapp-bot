import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Secrets } from '@src/common/secrets';
import { IncomingMessage, MessageReplyPayload } from '@src/common/types';
import { GeminiService } from '@src/gemini/gemini.service';
import logger from '@src/common/logger';
import { ApiService } from '@src/backend';

@Injectable()
export class MessageService {
  private readonly context: string = MessageService.name;
  private readonly httpInstance: AxiosInstance;

  constructor(
    private readonly gemini: GeminiService,
    private readonly apiService: ApiService,
  ) {
    try {
      this.httpInstance = axios.create({
        baseURL: `${Secrets.WHATSAPP_MESSAGING_API_URL}`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Secrets.WHATSAPP_USER_ACCESS_TOKEN}`,
        },
      });
    } catch (error) {
      logger.error(
        `[${this.context}] Error connecting to WhatsApp Cloud API: ${error.message}`,
      );

      throw error;
    }
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

      return;
    } catch (error) {
      throw error;
    }
  }

  async handleIncomingMessage(message: IncomingMessage) {
    try {
      const senderId = message.from;
      const messageId = message.id;

      if (message.type === 'text') {
        let finalResponse: string;

        // Process incoming message from user
        const userInput = message.text.body;
        const firstResponse = await this.gemini.processUserMessage(
          senderId,
          userInput,
        );

        if (typeof firstResponse === 'string') {
          // Model responds directly with text (initial welcome message or follow-up question)
          finalResponse = firstResponse;
        } else {
          // Model makes a function call (requires context from backend service)
          const functionCall = firstResponse;

          // Retrieve data from backend service to be used as context
          const apiContext = await this.apiService.selectEndpoint(functionCall);

          // Process results of function call and generate final response
          const secondResponse = await this.gemini.processFunctionCall(
            senderId,
            apiContext,
          );

          finalResponse = secondResponse;
        }

        // Configure request payload
        const payload: MessageReplyPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: senderId,
          type: 'text',
          context: {
            message_id: messageId,
          },
          text: {
            preview_url: false,
            body: finalResponse,
          },
        };

        // Mark incoming message as read and send reply
        await this.markMessageAsRead(messageId);
        await this.httpInstance.post('messages', JSON.stringify(payload));

        logger.info(`[${this.context}] Reply sent successfully`);
        return;
      }
    } catch (error) {
      throw error;
    }
  }
}
