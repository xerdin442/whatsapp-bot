import { Controller, Get, Res, HttpStatus, Post } from '@nestjs/common';
import { Response } from 'express';

@Controller()
export class AppController {
  @Get('health')
  heatlhCheck(@Res() res: Response) {
    return res.status(HttpStatus.OK).send('Service is healthy!');
  }

  @Post('payments/callback')
  async checkPaymentStatus() {}
}
