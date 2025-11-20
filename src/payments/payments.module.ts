import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payments-queue',
    }),
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
