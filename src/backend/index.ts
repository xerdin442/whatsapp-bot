import { FunctionCall } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { Secrets } from '@src/common/secrets';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ApiService {
  private readonly httpInstance: AxiosInstance;

  constructor() {
    this.httpInstance = axios.create({
      baseURL: `${Secrets.BACKEND_SERVICE_URL}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Secrets.BACKEND_SERVICE_API_KEY}`,
      },
    });
  }

  async selectEndpoint(funcCall: FunctionCall) {
    try {
      switch (funcCall.name) {
        case 'find_events':
          await this.findEventsByFilters(funcCall.args!);
          break;

        case 'find_nearby_events':
          await this.getNearbyEvents();
          break;

        case 'find_trending_events':
          await this.getTrendingEvents();
          break;

        case 'select_ticket_tier':
          await this.selectTicketTier();
          break;

        case 'initiate_ticket_purchase':
          await this.initiateTicketPurchase();
          break;

        default:
          throw new Error('Invalid function call');
      }
    } catch (error) {
      throw error;
    }
  }

  async findEventsByFilters(args: Record<string, any>) {}

  async getNearbyEvents() {}

  async getTrendingEvents() {}

  async selectTicketTier() {
    // store details in redis
  }

  async initiateTicketPurchase() {
    // fetch purchase details from redis
  }
}
