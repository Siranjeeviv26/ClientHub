import { Controller, Post, Req, Res, HttpCode, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { BillingService } from '../billing.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly billingService: BillingService) {}

  @Post('stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      await this.billingService.handleWebhook('stripe', req.body, signature);
      res.json({ received: true });
    } catch (error) {
      this.logger.error(`Stripe webhook error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }

  @Post('razorpay')
  @HttpCode(200)
  @ApiOperation({ summary: 'Razorpay webhook handler' })
  async handleRazorpayWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      await this.billingService.handleWebhook('razorpay', req.body, signature);
      res.json({ received: true });
    } catch (error) {
      this.logger.error(`Razorpay webhook error: ${error.message}`);
      res.status(400).json({ error: error.message });
    }
  }
}
