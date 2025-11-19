import { FunctionDeclaration, Tool, Type } from '@google/genai';

const findEventByName: FunctionDeclaration = {
  name: 'find_event_by_name',
  description: `Searches for the details of a specific event based on the name provided by the user.
    If it is a partial name, it retrieves a list of events that match the search string`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventName: {
        type: Type.STRING,
        description:
          'The full or partial name of the event the user is looking for (e.g. "Burna Boy Homecoming Concert", "Devfest 2025")',
      },
    },
    required: ['eventName'],
  },
};

const findEventsByDate: FunctionDeclaration = {
  name: 'find_events_by_date',
  description:
    'Retrieves a list of upcoming events happening on the date provided by the user',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventDate: {
        type: Type.STRING,
        description: `The date of the event the user is looking for (e.g. "19th December 2025", "2025-12-11", "10th of January").
          If the user does not provide a "year" value in the request, default to the year of the current date.
          If the date provided by the user is less than the current date, request for a valid date value. 
          `,
      },
    },
    required: ['eventDate'],
  },
};

const getTrendingEvents: FunctionDeclaration = {
  name: 'get_trending_events',
  description: 'Retrieves a list of the most popular and trending events',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const selectTicketTier: FunctionDeclaration = {
  name: 'select_ticket_tier',
  description:
    'Retrieves a list of ticket tiers available for a specific event',
  parameters: {
    type: Type.OBJECT,
    properties: {
      tierName: {
        type: Type.STRING,
        description: 'The name of the ticket tier the user intends to purchase',
      },
      quantity: {
        type: Type.NUMBER,
        description:
          'The number of tickets the user intends to purchase in this tier',
      },
    },
    required: ['tierName', 'quantity'],
  },
};

const initiateTicketPurchase: FunctionDeclaration = {
  name: 'initiate_ticket_purchase',
  description:
    'Generates a secure checkout link to initiate purchase of the selected tickets',
  parameters: {
    type: Type.OBJECT,
    properties: {
      email: {
        type: Type.STRING,
        description:
          'Valid email address of the user, required to generate checkout link',
      },
    },
    required: ['email'],
  },
};

const checkPaymentStatus: FunctionDeclaration = {
  name: 'check_payment_status',
  description: 'Checks the payment status of a ticket purchse transaction',
  parameters: {
    type: Type.OBJECT,
    properties: {
      transactionReference: {
        type: Type.STRING,
        description: 'Unique reference of the ticket purchase transaction',
      },
    },
    required: ['transactionReference'],
  },
};

export const REQUIRED_TOOLS: Tool = {
  functionDeclarations: [
    findEventsByDate,
    findEventByName,
    getTrendingEvents,
    selectTicketTier,
    initiateTicketPurchase,
    checkPaymentStatus,
  ],
};
