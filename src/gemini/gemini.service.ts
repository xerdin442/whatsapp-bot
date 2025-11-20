import {
  Content,
  FunctionCall,
  GenerateContentResponse,
  GoogleGenAI,
  Part,
} from '@google/genai';
import { Inject, Injectable } from '@nestjs/common';
import logger from '@src/common/logger';
import { Secrets } from '@src/common/secrets';
import { ConversationContext, ConversationState } from '@src/common/types';
import { REDIS_CLIENT } from '@src/redis/redis.module';
import { RedisClientType } from 'redis';
import { SYSTEM_INSTRUCTIONS } from './helpers/instructions';
import { REQUIRED_TOOLS } from './helpers/functions';
import { createHashedKey } from '@src/common/util';

@Injectable()
export class GeminiService {
  private readonly context: string = GeminiService.name;
  private readonly gemini: GoogleGenAI;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClientType) {
    this.gemini = new GoogleGenAI({ apiKey: Secrets.GEMINI_API_KEY });
  }

  getNextStateAfterFunctionCall(funcName: string): ConversationState {
    if (funcName.includes('find')) return 'event_query';
    if (funcName.includes('select_event')) return 'event_selected';
    if (funcName.includes('tier')) return 'ticket_tier_selected';
    if (funcName.includes('initiate')) return 'awaiting_payment';

    throw new Error('Invalid function name');
  }

  async updateChatHistory(
    phoneId: string,
    context: ConversationContext,
  ): Promise<void> {
    try {
      const cacheKey = `chat_history:${createHashedKey(phoneId)}`;
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
      const cacheKey = `chat_history:${createHashedKey(phoneId)}`;
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
  ): Promise<string | FunctionCall> {
    try {
      let currentState: ConversationState;
      let contentsFromHistory: Content[] = [];
      let result: string | FunctionCall;
      const modelContextPart: Part = {};

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
        currentState = this.getNextStateAfterFunctionCall(
          firstPart.functionCall.name!,
        );

        result = firstPart.functionCall;
        modelContextPart.functionCall = result;
      } else {
        result = modelResponse.text!;
        modelContextPart.text = result;
      }

      // Add user input to conversation history
      const userContext: ConversationContext = {
        content: { role: 'user', parts: [{ text: userInput }] },
        currentState,
      };
      await this.updateChatHistory(phoneId, userContext);

      // Add model response to conversation history
      const modelContext: ConversationContext = {
        content: { role: 'model', parts: [modelContextPart] },
        currentState,
      };
      await this.updateChatHistory(phoneId, modelContext);

      return result;
    } catch (error) {
      logger.error(
        `[${this.context}] Error processing user message with Gemini: ${error.message}`,
      );

      // Update conversation history with response generation error
      const modelContext: ConversationContext = {
        content: {
          role: 'model',
          parts: [{ text: 'Response generation error' }],
        },
        currentState: 'response_error',
      };
      await this.updateChatHistory(phoneId, modelContext);

      return 'Sorry, I am unable to process your request at the moment.';
    }
  }

  async processFunctionCall(
    phoneId: string,
    apiContext: Record<string, any>,
  ): Promise<string> {
    try {
      // Fetch current conversation history
      const chatHistory = await this.getChatHistory(phoneId);

      // Get current state
      const currentState = chatHistory[chatHistory.length - 1].currentState;

      // Retrieve details of last function call
      const contentsFromHistory = chatHistory.map((chat) => chat.content);
      const lastFunctionCallRecord = contentsFromHistory.findLast(
        (record) => record.role === 'model' && record.parts?.[0].functionCall,
      );
      if (!lastFunctionCallRecord) {
        throw new Error('Missing function call in conversation history');
      }

      // Define the response from the function call
      const functionCall = lastFunctionCallRecord.parts?.[0].functionCall;
      const functionResponsePart: Part = {
        functionResponse: {
          name: functionCall?.name,
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

      // Add function call to conversation history
      const userContext: ConversationContext = {
        content: { role: 'function', parts: [functionResponsePart] },
        currentState,
      };
      await this.updateChatHistory(phoneId, userContext);

      // Add model's final response to conversation history
      const modelContext: ConversationContext = {
        content: { role: 'model', parts: [{ text: modelResponse.text }] },
        currentState,
      };
      await this.updateChatHistory(phoneId, modelContext);

      return modelResponse.text!;
    } catch (error) {
      logger.error(
        `[${this.context}] Error processing function call with Gemini: ${error.message}`,
      );

      // Update conversation history with response generation error
      const modelContext: ConversationContext = {
        content: {
          role: 'model',
          parts: [{ text: 'Response generation error' }],
        },
        currentState: 'response_error',
      };
      await this.updateChatHistory(phoneId, modelContext);

      return 'Sorry, I am unable to process your request at the moment.';
    }
  }
}
