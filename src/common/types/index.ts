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
