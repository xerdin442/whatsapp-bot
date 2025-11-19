import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Config Service
const config = new ConfigService();

export const Secrets = {
  PORT: config.getOrThrow<number>('PORT'),
  NODE_ENV: config.getOrThrow<string>('NODE_ENV'),
  REDIS_PORT: config.getOrThrow<number>('REDIS_PORT'),
  REDIS_HOST: config.getOrThrow<string>('REDIS_HOST'),
  REDIS_PASSWORD: config.getOrThrow<string>('REDIS_PASSWORD'),
  REDIS_URL: config.getOrThrow<string>('REDIS_URL'),
  RATE_LIMIT_PER_SECOND: config.getOrThrow<number>('RATE_LIMIT_PER_SECOND'),
  RATE_LIMIT_PER_MINUTE: config.getOrThrow<number>('RATE_LIMIT_PER_MINUTE'),
  WHATSAPP_WEBHOOK_VERIFICATION_TOKEN: config.getOrThrow<string>(
    'WHATSAPP_WEBHOOK_VERIFICATION_TOKEN',
  ),
  WHATSAPP_API_VERSION: config.getOrThrow<string>('WHATSAPP_API_VERSION'),
  WHATSAPP_USER_ACCESS_TOKEN: config.getOrThrow<string>(
    'WHATSAPP_USER_ACCESS_TOKEN',
  ),
  WHATSAPP_PHONE_NUMBER_ID: config.getOrThrow<string>(
    'WHATSAPP_PHONE_NUMBER_ID',
  ),
  WHATSAPP_BUSINESS_ACCOUNT_ID: config.getOrThrow<string>(
    'WHATSAPP_BUSINESS_ACCOUNT_ID',
  ),
  GEMINI_API_KEY: config.getOrThrow<string>('GEMINI_API_KEY'),
  HASHING_SALT: config.getOrThrow<string>('HASHING_SALT'),
};
