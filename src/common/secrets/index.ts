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
};
