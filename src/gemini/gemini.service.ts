import {
  Content,
  GenerateContentResponse,
  GoogleGenAI,
  Part,
} from '@google/genai';
import { Inject, Injectable } from '@nestjs/common';
import logger from '@src/common/logger';
import { Secrets } from '@src/common/secrets';
import {
  ConversationContext,
  ConversationState,
  ModelResponse,
} from '@src/common/types';
import { REDIS_CLIENT } from '@src/redis/redis.module';
import { createHmac } from 'crypto';
import { RedisClientType } from 'redis';
import { SYSTEM_INSTRUCTIONS } from './instructions';
import { REQUIRED_TOOLS } from './functions';

@Injectable()
export class GeminiService {
  private readonly context: string = GeminiService.name;
  private readonly gemini: GoogleGenAI;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClientType) {
    this.gemini = new GoogleGenAI({ apiKey: Secrets.GEMINI_API_KEY });
  }

  createHash(phoneId: string): string {
    return createHmac('sha256', Secrets.HASHING_SALT)
      .update(phoneId)
      .digest('hex');
  }

  getNextStateAfterFunctionCall(funcName: string): ConversationState {
    if (funcName.includes('events')) return 'event_selected';
    if (funcName.includes('tier')) return 'ticket_tier_selected';
    if (funcName.includes('purchase')) return 'awaiting_payment';
    if (funcName.includes('status')) return 'completed';

    throw new Error('Invalid function name');
  }

  async updateChatHistory(
    phoneId: string,
    context: ConversationContext,
  ): Promise<void> {
    try {
      const cacheKey = this.createHash(phoneId);
      await this.redis.rPush(cacheKey, JSON.stringify(context));

      // Clear stored contexts in chat history after 6 hours
      await this.redis.expire(cacheKey, 6 * 3600);
    } catch (error) {
      logger.error(
        `[${this.context}] Error updating chat history in Redis: ${error.message}`,
      );

      throw error;
    }
  }

  async getChatHistory(phoneId: string): Promise<ConversationContext[]> {
    try {
      const cacheKey = this.createHash(phoneId);
      const cacheResult = await this.redis.lRange(cacheKey, 0, -1);

      if (cacheResult.length > 0) {
        const chatHistory = cacheResult.map(
          (item) => JSON.parse(item) as ConversationContext,
        );

        return chatHistory;
      }

      return [];
    } catch (error) {
      logger.error(
        `[${this.context}] Error fetching chat history from Redis: ${error.message}`,
      );

      throw error;
    }
  }

  async generateModelResponse(
    contents: Content[],
  ): Promise<GenerateContentResponse> {
    try {
      const response = await this.gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTIONS,
          tools: [REQUIRED_TOOLS],
        },
      });

      return response;
    } catch (error) {
      throw error;
    }
  }

  async processUserMessage(
    phoneId: string,
    userInput: string,
  ): Promise<ModelResponse> {
    try {
      let currentState: ConversationState;
      let contentsFromHistory: Content[] = [];

      // Fetch current conversation history
      const chatHistory = await this.getChatHistory(phoneId);

      // Extract the current state and contents of the conversation history
      if (chatHistory.length > 0) {
        currentState = chatHistory[chatHistory.length - 1].currentState;
        contentsFromHistory = chatHistory.map((chat) => chat.content);
      } else {
        currentState = 'initial';
      }

      // Configure the context to be passed to the model
      const contents: Content[] = [
        ...contentsFromHistory,
        { role: 'user', parts: [{ text: userInput }] },
      ];

      // Generate model response
      const modelResponse = await this.generateModelResponse(contents);

      // Check the response if the model made a function call
      const firstPart = modelResponse.candidates?.[0].content?.parts?.[0];
      if (firstPart && firstPart.functionCall) {
        // Determine the next conversation state based on the function call
        const newState = this.getNextStateAfterFunctionCall(
          firstPart.functionCall.name!,
        );

        return { output: firstPart.functionCall, newState, phoneId };
      } else {
        return { output: modelResponse.text!, newState: currentState };
      }
    } catch (error) {
      logger.error(
        `[${this.context}] Error processing user message with Gemini: ${error.message}`,
      );

      return {
        output: 'Sorry, I am unable to process your request at the moment.',
        newState: 'response_error',
      };
    }
  }

  async processFunctionCall(
    phoneId: string,
    apiContext: Record<string, any>,
  ): Promise<ModelResponse> {
    try {
      // Fetch current conversation history
      const chatHistory = await this.getChatHistory(phoneId);

      // Get current state
      const currentState = chatHistory[chatHistory.length - 1].currentState;

      // Retreive details of last function call
      const contentsFromHistory = chatHistory.map((chat) => chat.content);
      const lastFunctionCallRecord = contentsFromHistory.findLast(
        (record) => record.role === 'model' && record.parts?.[0].functionCall,
      );
      if (!lastFunctionCallRecord) {
        throw new Error('Missing function call in conversation history');
      }

      // Define the function response
      const toolCall = lastFunctionCallRecord.parts?.[0].functionCall;
      const functionResponsePart: Part = {
        functionResponse: {
          name: toolCall?.name,
          response: apiContext, // Data from the backend service passed as context to the model
        },
      };

      // Configure the context to be passed to the model
      const contents: Content[] = [
        ...contentsFromHistory,
        { role: 'function', parts: [functionResponsePart] },
      ];

      // Generate model response
      const modelResponse = await this.generateModelResponse(contents);

      // Reset conversation state if ticket purchase is complete
      const finalState: ConversationState =
        currentState === 'completed' ? 'initial' : currentState;

      return { output: modelResponse.text!, newState: finalState };
    } catch (error) {
      logger.error(
        `[${this.context}] Error processing function call with Gemini: ${error.message}`,
      );

      return {
        output: 'Sorry, I am unable to process your request at the moment.',
        newState: 'response_error',
      };
    }
  }
}
