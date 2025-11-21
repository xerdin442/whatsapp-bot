import { FunctionCall } from '@google/genai';
import { Inject, Injectable } from '@nestjs/common';
import logger from '@src/common/logger';
import { Secrets } from '@src/common/secrets';
import { ApiResponse, Event, TicketTier } from '@src/common/types';
import { createHashedKey } from '@src/common/util';
import { REDIS_CLIENT } from '@src/redis/redis.module';
import axios, { AxiosInstance } from 'axios';
import { RedisClientType } from 'redis';

@Injectable()
export class ApiService {
  private readonly context: string = ApiService.name;
  private readonly httpInstance: AxiosInstance;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClientType) {
    this.httpInstance = axios.create({
      baseURL: `${Secrets.BACKEND_SERVICE_URL}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Secrets.BACKEND_SERVICE_API_KEY}`,
      },
    });
  }

  async selectEndpoint(
    funcCall: FunctionCall,
    phoneId?: string,
  ): Promise<Record<string, any>> {
    try {
      switch (funcCall.name) {
        case 'find_events':
          return this.findEventsByFilters(funcCall.args!);

        // case 'find_nearby_events':
        //   return this.getNearbyEvents(funcCall.args!);

        case 'find_trending_events':
          return this.getTrendingEvents();

        case 'select_event':
          return this.selectEvent(funcCall.args?.eventId as number);

        case 'select_ticket_tier':
          return this.selectTicketTier(funcCall.args!, phoneId!);

        case 'initiate_ticket_purchase':
          return this.initiateTicketPurchase(
            funcCall.args?.email as string,
            phoneId!,
          );

        default:
          throw new Error('Invalid function call');
      }
    } catch (error) {
      throw error;
    }
  }

  async findEventsByFilters(args: Record<string, any>): Promise<Event[]> {
    try {
      const params = new URLSearchParams();

      for (const key in args) {
        const value = args[key] as string | string[];

        if (Array.isArray(value)) {
          value.forEach((item) => params.append(key, item));
        } else if (value !== undefined && value !== null) {
          params.append(key === 'numberOfQueries' ? 'page' : key, value);
        }
      }

      const response = await this.httpInstance.get<ApiResponse>(
        `events?${params.toString()}`,
      );

      return response.data.events!;
    } catch (error) {
      logger.error(
        `[${this.context}] Error fetching upcoming events by filters: ${error.message}`,
      );

      throw error;
    }
  }

  // async getNearbyEvents(args: Record<string, any>): Promise<Event[]> {}

  async getTrendingEvents(): Promise<Event[]> {
    try {
      const response =
        await this.httpInstance.get<ApiResponse>('events/trending');

      return response.data.events!;
    } catch (error) {
      logger.error(
        `[${this.context}] Error fetching all trending events: ${error.message}`,
      );

      throw error;
    }
  }

  async selectEvent(eventId: number): Promise<TicketTier[]> {
    try {
      const response = await this.httpInstance.get<ApiResponse>(
        `events/${eventId}/tickets`,
      );

      return response.data.tickets!;
    } catch (error) {
      logger.error(
        `[${this.context}] Error fetching available ticket tiers for an event: ${error.message}`,
      );

      throw error;
    }
  }

  async selectTicketTier(
    args: Record<string, any>,
    phoneId: string,
  ): Promise<{ message: string }> {
    try {
      // Store purchase details in cache
      const cacheKey = `ticket_purchase:${createHashedKey(phoneId)}`;
      await this.redis.setEx(cacheKey, 3 * 3600, JSON.stringify({ ...args }));

      return { message: 'Ticket purchase details stored in cache' };
    } catch (error) {
      logger.error(
        `[${this.context}] Error storing ticket purchase details in cache: ${error.message}`,
      );

      throw error;
    }
  }

  async initiateTicketPurchase(
    email: string,
    phoneId: string,
  ): Promise<{ checkout: string } | { message: string }> {
    try {
      const cacheKey = `ticket_purchase:${createHashedKey(phoneId)}`;
      const cacheResult = await this.redis.get(cacheKey);

      if (!cacheResult) {
        return {
          message:
            'Ticket purchase window has expired. Please restart the process',
        };
      }

      // Extract purchase details
      const details = JSON.parse(cacheResult) as Record<string, any>;

      // Configure request payload
      const payload = JSON.stringify({
        tier: details.tierName as string,
        quantity: +details.quantity,
        email,
        whatsappPhoneId: phoneId,
      });

      // Send request to backend service
      const response = await this.httpInstance.post<ApiResponse>(
        `events/${details.eventId}/tickets/purchase`,
        payload,
      );

      return { checkout: response.data.checkout! };
    } catch (error) {
      logger.error(
        `[${this.context}] Error generating checkout link for ticket purchase: ${error.message}`,
      );

      throw error;
    }
  }
}
