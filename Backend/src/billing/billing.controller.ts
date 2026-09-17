import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('razorpay/key')
  @ApiOperation({ summary: 'Get Razorpay public key for checkout' })
  async getRazorpayKey() {
    return {
      key: this.configService.get<string>('RAZORPAY_KEY_ID') || this.configService.get<string>('app.razorpay.keyId') || 'rzp_test_TcyE5iXeV4CAqG',
    };
  }

  @Post('razorpay/order')
  @Permissions('organization:billing:update')
  @ApiOperation({ summary: 'Create Razorpay order for a plan' })
  async createRazorpayOrder(
    @CurrentOrg() organizationId: string,
    @Body('planSlug') planSlug: string,
  ) {
    return this.billingService.createRazorpayOrder(organizationId, planSlug);
  }

  @Post('razorpay/verify')
  @Permissions('organization:billing:update')
  @ApiOperation({ summary: 'Verify Razorpay payment and activate subscription' })
  async verifyRazorpayPayment(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body() body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string; planSlug: string },
  ) {
    return this.billingService.verifyRazorpayPayment(organizationId, userId, body);
  }

  @Get('subscription/status')
  @Permissions('organization:billing:read')
  @ApiOperation({ summary: 'Get current subscription status' })
  async getSubscriptionStatus(@CurrentOrg() organizationId: string) {
    return this.billingService.getSubscriptionStatus(organizationId);
  }

  @Get('payments/history')
  @Permissions('organization:billing:read')
  @ApiOperation({ summary: 'Get stored Razorpay/subscription payment history for the organization' })
  async getPaymentHistory(@CurrentOrg() organizationId: string) {
    return this.billingService.getPaymentHistory(organizationId);
  }

  @Post('subscription/trial')
  @Permissions('organization:billing:update')
  @ApiOperation({ summary: 'Start a free trial' })
  async startTrial(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body('planSlug') planSlug: string,
  ) {
    return this.billingService.startTrial(organizationId, planSlug, userId);
  }

  @Post('subscription')
  @Permissions('organization:billing:update')
  @ApiOperation({ summary: 'Create a new subscription' })
  async createSubscription(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body('planSlug') planSlug: string,
    @Body('paymentMethodId') paymentMethodId?: string,
  ) {
    return this.billingService.createSubscription(organizationId, planSlug, userId, paymentMethodId);
  }

  @Post('subscription/upgrade')
  @Permissions('organization:billing:update')
  @ApiOperation({ summary: 'Upgrade to a higher plan' })
  async upgradePlan(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body('planSlug') planSlug: string,
  ) {
    return this.billingService.upgradePlan(organizationId, planSlug, userId);
  }

  @Post('subscription/downgrade')
  @Permissions('organization:billing:update')
  @ApiOperation({ summary: 'Downgrade to a lower plan' })
  async downgradePlan(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
    @Body('planSlug') planSlug: string,
  ) {
    return this.billingService.downgradePlan(organizationId, planSlug, userId);
  }

  @Post('subscription/cancel')
  @Permissions('organization:billing:update')
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(
    @CurrentOrg() organizationId: string,
    @CurrentUser('_id') userId: string,
  ) {
    return this.billingService.cancelSubscription(organizationId, userId);
  }
}
