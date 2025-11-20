import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { BullModule } from '@nestjs/bull';
import { PaymentsProcessor } from './payments.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'payments-queue',
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsProcessor],
})
export class PaymentsModule {}
