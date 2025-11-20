import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { Secrets } from '../secrets';
import { createHmac } from 'crypto';

export const applyThrottlerConfig = (): ThrottlerModuleOptions => {
  const throttles = [
    {
      name: 'Seconds',
      ttl: 1000,
      limit: Secrets.RATE_LIMIT_PER_SECOND,
    },
    {
      name: 'Minutes',
      ttl: 60000,
      limit: Secrets.RATE_LIMIT_PER_MINUTE,
    },
  ];

  return Secrets.NODE_ENV !== 'test' ? throttles : [];
};

export const createHashedKey = (key: string): string => {
  return createHmac('sha256', Secrets.HASHING_SALT).update(key).digest('hex');
};
