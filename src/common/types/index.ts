import { Content } from '@google/genai';
import { AxiosResponse } from 'axios';
import { Request } from 'express';

export type IncomingMessageType = 'text' | 'location';

export interface IncomingMessage {
  context?: {
    from: string;
    id: string;
  };
  from: string;
  id: string;
  timestamp: string;
  type: IncomingMessageType;
  text?: {
    body: string;
  };
  location?: {
    address?: string;
    latitude: number;
    longitude: number;
    name?: string;
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

export type MessageReplyType = 'text' | 'interactive';

export interface MessageReplyPayload {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: MessageReplyType;
  context?: {
    message_id: string;
  };
  text?: {
    preview_url: true;
    body: string;
  };
  interactive?: {
    type: 'location_request_message';
    body: {
      text: string;
    };
    action: {
      name: 'send_location';
    };
  };
}

export interface PaymentWebhookPayload {
  reference: string;
  status: 'success' | 'failed' | 'refund';
  phoneId: string;
  email: string;
  reason?: string;
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
