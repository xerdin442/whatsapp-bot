import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { Secrets } from './common/secrets';
import { applyThrottlerConfig } from './common/util';
import { RedisModule } from './redis/redis.module';
import { MessageModule } from './message/message.module';
import { GeminiModule } from './gemini/gemini.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      redis: {
        host: Secrets.REDIS_HOST,
        port: Secrets.REDIS_PORT,
        password:
          Secrets.NODE_ENV !== 'test' ? Secrets.REDIS_PASSWORD : undefined,
        family: 0,
        tls: {
          rejectUnauthorized: false,
        },
      },
      prefix: 'whatsapp-bot',
    }),
    ThrottlerModule.forRoot(applyThrottlerConfig()),
    RedisModule,
    MessageModule,
    GeminiModule,
    PaymentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
