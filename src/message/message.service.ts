import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { Secrets } from '@src/common/secrets';
import {
  ConversationContext,
  Event,
  IncomingMessage,
  MessageReplyPayload,
} from '@src/common/types';
import { GeminiService } from '@src/gemini/gemini.service';
import logger from '@src/common/logger';
import { ApiService } from '@src/backend';
import { formatDate } from '@src/common/util';

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

  async sendLocationRequest(phoneId: string, messageId: string): Promise<void> {
    try {
      // Configure request payload
      const payload: MessageReplyPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneId,
        type: 'interactive',
        context: {
          message_id: messageId,
        },
        interactive: {
          type: 'location_request_message',
          body: {
            text: 'To help us find nearby events, please share your location.',
          },
          action: {
            name: 'send_location',
          },
        },
      };

      // Mark incoming message as read and send reply
      await this.markMessageAsRead(messageId);
      await this.httpInstance.post('messages', JSON.stringify(payload));

      return;
    } catch (error) {
      throw error;
    }
  }

  async sendInteractiveBtnMessage(phoneId: string, event: Event) {
    try {
      // Configure request payload
      const payload: MessageReplyPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneId,
        type: 'interactive',
        interactive: {
          type: 'button',
          header: {
            type: 'image',
            image: {
              link: event.poster,
            },
          },
          body: {
            text: `${event.title.toUpperCase()}\n\nDate: ${formatDate(event.date)}`,
          },
          action: {
            buttons: [
              {
                type: 'reply',
                reply: {
                  id: `I want to attend event with ID: ${event.id}`,
                  title: 'Select',
                },
              },
            ],
          },
        },
      };

      await this.httpInstance.post('messages', JSON.stringify(payload));
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
        const userInput = message.text?.body;
        const firstResponse = await this.gemini.processUserMessage(
          senderId,
          userInput as string,
        );

        if (typeof firstResponse === 'string') {
          // Model responds directly with text (initial welcome message or follow-up question)
          finalResponse = firstResponse;
        } else {
          // Model makes a function call (requires context from backend service)
          const functionCall = firstResponse;

          // Retrieve data from backend service to be used as context
          if (functionCall.name === 'find_nearby_events') {
            // Send a location request to the user to get coordinates
            await this.sendLocationRequest(senderId, messageId);

            return;
          } else {
            const apiContext = await this.apiService.selectEndpoint(
              functionCall,
              senderId,
            );

            // Send interactive buttton messages if context is a list of events
            if (functionCall.name?.startsWith('find_')) {
              const events = apiContext.events as Event[];

              if (events.length > 0) {
                // Add function result to conversation history
                const functionResult: ConversationContext = {
                  content: {
                    role: 'function',
                    parts: [
                      {
                        functionResponse: {
                          name: functionCall.name,
                          response: { apiContext },
                        },
                      },
                    ],
                  },
                  currentState: 'event_query',
                };
                await this.gemini.updateChatHistory(senderId, functionResult);

                // Mark incoming message as read
                await this.markMessageAsRead(messageId);

                // Send list of events (trending or filter search results) to user
                await Promise.allSettled(
                  events.map(async (event) => {
                    await this.sendInteractiveBtnMessage(senderId, event);
                  }),
                );

                return;
              }
            }

            // Process results of function call and generate final response
            const secondResponse = await this.gemini.processFunctionCall(
              senderId,
              apiContext,
            );

            finalResponse = secondResponse;
          }
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
            preview_url: true,
            body: finalResponse,
          },
        };

        // Mark incoming message as read and send reply
        await this.markMessageAsRead(messageId);
        await this.httpInstance.post('messages', JSON.stringify(payload));
      } else if (message.type === 'location') {
        // Extract coordinates from location message
        const { latitude, longitude } = message.location!;

        // Fetch nearby events from backend service
        const apiContext = await this.apiService.getNearbyEvents(
          latitude,
          longitude,
        );

        if (apiContext.events.length > 0) {
          // Add function result to conversation history
          const functionResult: ConversationContext = {
            content: {
              role: 'function',
              parts: [
                {
                  functionResponse: {
                    name: 'find_nearby_events',
                    response: { apiContext },
                  },
                },
              ],
            },
            currentState: 'event_query',
          };
          await this.gemini.updateChatHistory(senderId, functionResult);

          // Mark incoming message as read
          await this.markMessageAsRead(messageId);

          // Send list of nearby events to user
          await Promise.allSettled(
            apiContext.events.map(async (event) => {
              await this.sendInteractiveBtnMessage(senderId, event);
            }),
          );

          return;
        }

        // Update function call with empty nearby events result
        const finalResponse = await this.gemini.processFunctionCall(
          senderId,
          apiContext,
        );

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
            preview_url: true,
            body: finalResponse,
          },
        };

        // Mark incoming message as read and inform the user that there are no events
        await this.markMessageAsRead(messageId);
        await this.httpInstance.post('messages', JSON.stringify(payload));
      } else if (message.type === 'interactive') {
        if (!message.interactive) {
          throw new Error(
            'Invalid webhook response for interactive button message',
          );
        }

        // Extract details of user's choice and pass as context to model
        const userInput = message.interactive.button_reply.id;
        const firstResponse = await this.gemini.processUserMessage(
          senderId,
          userInput,
        );

        // Verify that model's response is a function call
        if (typeof firstResponse === 'string') {
          throw new Error('Incorrect model response. Expected a function call');
        }

        // Verify details of function call
        const functionCall = firstResponse;
        if (functionCall.name !== 'select_event') {
          throw new Error(
            `Incorrect function call from model. Expected "select_event", received: "${functionCall.name}"`,
          );
        }

        const apiContext = await this.apiService.selectEndpoint(functionCall);
        const finalResponse = await this.gemini.processFunctionCall(
          senderId,
          apiContext,
        );

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
            preview_url: true,
            body: finalResponse,
          },
        };

        // Mark incoming message as read and send available ticket tiers to user
        await this.markMessageAsRead(messageId);
        await this.httpInstance.post('messages', JSON.stringify(payload));
      }

      logger.info(`[${this.context}] Reply sent successfully`);
      return;
    } catch (error) {
      throw error;
    }
  }
}
