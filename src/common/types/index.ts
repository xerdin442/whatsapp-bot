import { Content } from '@google/genai';
import { AxiosResponse } from 'axios';
import { Request } from 'express';

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text: {
    body: string;
  };
}

export interface WebhookRequest extends Request {
  body: {
    entry: {
      id: string;
      changes: {
        value: {
          messages: IncomingMessage[];
        };
        field: string;
      }[];
    }[];
  };
}

export interface MessageReplyPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  context?: {
    message_id: string;
  };
  text: {
    preview_url: false;
    body: string;
  };
}

export type ConversationState =
  | 'initial'
  | 'event_query'
  | 'event_selected'
  | 'ticket_tier_selected'
  | 'awaiting_payment'
  | 'completed'
  | 'response_error';

export interface ConversationContext {
  content: Content;
  currentState: ConversationState;
}

export interface Event {
  id: number;
  title: string;
  description: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  ageRestriction?: number;
  venue: string;
  address: string;
  poster: string;
}

export type DiscountStatus = 'ACTIVE' | 'ENDED';

export interface TicketTier {
  name: string;
  id: number;
  price: number;
  discount: boolean;
  discountPrice?: number;
  discountExpiration?: Date;
  numberOfDiscountTickets?: number;
  discountStatus?: DiscountStatus;
  benefits?: string;
  totalNumberOfTickets: number;
  soldOut: boolean;
}

export interface ApiResponse extends AxiosResponse {
  events?: Event[];
  checkout?: string;
  tickets?: TicketTier[];
}
