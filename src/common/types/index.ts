import { Content } from '@google/genai';
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
  context: {
    message_id: string;
  };
  text: {
    preview_url: false;
    body: string;
  };
}

export type ConversationState =
  | 'initial'
  | 'event_selected'
  | 'ticket_tier_selected'
  | 'awaiting_payment'
  | 'payment_status_check'
  | 'completed'
  | 'response_error';

export interface ConversationContext {
  content: Content;
  currentState: ConversationState;
}
