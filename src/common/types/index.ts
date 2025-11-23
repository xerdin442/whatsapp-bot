import { Content } from '@google/genai';
import { AxiosResponse } from 'axios';
import { Request } from 'express';

export interface IncomingMessage {
  context?: {
    from: string;
    id: string;
  };
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'location' | 'interactive';
  text?: {
    body: string;
  };
  location?: {
    address?: string;
    latitude: number;
    longitude: number;
    name?: string;
  };
  interactive?: {
    type: 'button_reply';
    button_reply: {
      id: string;
      title: string;
    };
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
  type: 'text' | 'interactive';
  context?: {
    message_id: string;
  };
  text?: {
    preview_url: true;
    body: string;
  };
  interactive?: {
    type: 'location_request_message' | 'button';
    header?: {
      type: 'image';
      image: {
        id: string;
      };
    };
    body: {
      text: string;
    };
    action: {
      name?: 'send_location';
      buttons?: {
        type: 'reply';
        reply: {
          id: string;
          title: string;
        };
      }[];
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
  whatsappImageId: string;
}

export interface TicketTier {
  name: string;
  id: number;
  price: number;
  discount: boolean;
  discountPrice?: number;
  discountExpiration?: Date;
  numberOfDiscountTickets?: number;
  discountStatus?: 'ACTIVE' | 'ENDED';
  benefits?: string;
  totalNumberOfTickets: number;
  soldOut: boolean;
}

export interface ApiResponse extends AxiosResponse {
  events?: Event[];
  checkout?: string;
  tickets?: TicketTier[];
}
