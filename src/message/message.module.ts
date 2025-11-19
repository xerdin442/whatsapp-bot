import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { ApiService } from '@src/backend';

@Module({
  providers: [MessageService, ApiService],
  controllers: [MessageController],
})
export class MessageModule {}
