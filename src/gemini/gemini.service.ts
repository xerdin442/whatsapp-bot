import { GoogleGenAI } from '@google/genai';
import { Injectable } from '@nestjs/common';
import { Secrets } from '@src/common/secrets';

@Injectable()
export class GeminiService {
  private readonly gemini: GoogleGenAI;

  constructor() {
    this.gemini = new GoogleGenAI({ apiKey: Secrets.GEMINI_API_KEY });
  }

  async generateResponse(userInput: string): Promise<string> {
    try {
      const stream = await this.gemini.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: { text: userInput },
      });

      let response = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          response += chunk.text;
        }
      }

      return response;
    } catch (error) {
      console.log(error);
      return 'Sorry, I am unable to process your request at the moment.';
    }
  }
}
