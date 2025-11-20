import { FunctionDeclaration, Tool, Type } from '@google/genai';

const findEventsByFilters: FunctionDeclaration = {
  name: 'find_events',
  description: `Retrieves a list of upcoming events based on the filters (i.e. title, location, categories or date) provided by the user.
    Only call this function when the user has provided any of the filters.
    User can provide multiple filters to help the function return more accurate search results.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventTitle: {
        type: Type.STRING,
        description: `The full or partial name of the event the user is looking for (e.g. "Burna Boy Homecoming Concert", "Devfest 2025").
          If it is a partial name, the function retrieves a list of events that match the search string`,
      },
      location: {
        type: Type.STRING,
        description: `The town, city, or state where the event is taking place.`,
      },
      venue: {
        type: Type.STRING,
        description: `The venue where the event is taking place.`,
      },
      startDate: {
        type: Type.STRING,
        description: `The start date of the event in ISO format: YYYY-MM-DD.
          If the user says "next week", return the ISO date string of the upcoming Monday.
          If the user says "next month", return the ISO date string of the first day of next month.
          If the user says "weekend", return the ISO date string of the upcoming Friday.
          Follow this process if the user provides other date values in grammatical phrases (e.g "within the week", "tomorrow", "a week from now", etc.).
          If the user does not provide a "year" value in the request, default to the year of the current date.
          If the date provided by the user is less than the current date, request for a valid date value.
          `,
      },
      endDate: {
        type: Type.STRING,
        description: `The end date of the event in ISO format: YYYY-MM-DD.
          This value is only required if the user provides a date range with a start and end (e.g "next month", "over the weekend").
          If the user says "next week", return the ISO date string of the upcoming Saturday.
          If the user says "next month", return the ISO date string of the last day of next month.
          If the user says "weekend", return the ISO date string of the upcoming Sunday.
          `,
      },
      categories: {
        type: Type.ARRAY,
        description:
          'The category of the event to search for. Must be one of the enumerated values. User can select multiple categories',
        items: {
          type: Type.STRING,
          enum: [
            'TECH',
            'HEALTH',
            'MUSIC',
            'COMEDY',
            'NIGHTLIFE',
            'ART',
            'FASHION',
            'SPORTS',
            'BUSINESS',
            'CONFERENCE',
            'OTHER',
          ],
        },
      },
      numberOfQueries: {
        type: Type.NUMBER,
        description: `Acts as a cursor to paginate the results of this function call when it is called consecutively
          with the same parameters to retrieve more events. Default is 1 for the first call.
          Value increments by 1 for each call. Resets to default value when another function is called`,
      },
    },
    required: ['numberOfQueries'],
  },
};

const findNearbyEvents: FunctionDeclaration = {
  name: 'find_nearby_events',
  description:
    'Retrieves a list of upcoming events happening close to the user',
  parameters: {
    type: Type.OBJECT,
    properties: {
      numberOfQueries: {
        type: Type.NUMBER,
        description: `Acts as a cursor to paginate the results of this function call when it is called consecutively
          with the same parameters to retrieve more events. Default is 1 for the first call.
          Value increments by 1 for each call. Resets to default value when another function is called`,
      },
    },
    required: ['numberOfQueries'],
  },
};

const findTrendingEvents: FunctionDeclaration = {
  name: 'find_trending_events',
  description: 'Retrieves a list of the most popular and trending events',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

const selectEvent: FunctionDeclaration = {
  name: 'select_event',
  description: `Returns a list of ticket tiers available for the specific event selected by the user.
    This function is called after the user has selected a specific event from a list of options presented to them.`,
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.NUMBER,
        description: 'The ID of the event selected by the user',
      },
    },
    required: ['eventId'],
  },
};

const selectTicketTier: FunctionDeclaration = {
  name: 'select_ticket_tier',
  description:
    'Stores the name of the selected ticket tier and the purchase quantity',
  parameters: {
    type: Type.OBJECT,
    properties: {
      eventId: {
        type: Type.NUMBER,
        description: `The ID of the event the ticket tier belongs to.
          Must match the ID of the specific event earlier selected by the user.`,
      },
      tierName: {
        type: Type.STRING,
        description: `The name of the ticket tier the user intends to purchase.
          This must match the names of the ticket tiers available in the selected event.`,
      },
      quantity: {
        type: Type.NUMBER,
        description:
          'The number of tickets the user intends to purchase in the selected tier',
      },
    },
    required: ['eventId', 'tierName', 'quantity'],
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

export const REQUIRED_TOOLS: Tool = {
  functionDeclarations: [
    findEventsByFilters,
    findNearbyEvents,
    findTrendingEvents,
    selectEvent,
    selectTicketTier,
    initiateTicketPurchase,
  ],
};
