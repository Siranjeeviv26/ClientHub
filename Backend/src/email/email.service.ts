import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { QUEUE_SERVICE } from '../queue/queue.interface';
import { QueueService } from '../queue/queue.interface';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly senderEmail: string;
  private readonly senderName: string;
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor(
    private configService: ConfigService,
    @Inject(QUEUE_SERVICE) private queueService: QueueService,
  ) {
    this.apiKey = this.configService.get<string>('app.brevo.apiKey') || '';
    this.senderEmail = this.configService.get<string>('app.brevo.senderEmail') || 'noreply@clienthub.local';
    this.senderName = this.configService.get<string>('app.brevo.senderName') || 'ClientHub';

    if (!this.apiKey) {
      this.logger.warn('⚠️ BREVO_API_KEY not configured - emails will be logged only');
    }
  }

  async sendEmail(data: EmailJobData): Promise<void> {
    if (!this.apiKey) {
      // Log metadata only — never log HTML/text bodies (may contain temp passwords/PII)
      this.logger.log(`📧 [DEV MODE] Email to ${data.to}: ${data.subject}`);
      return;
    }

    await this.queueService.add('send-email', data);
  }

  async sendVerificationEmail(email: string, token: string, clientUrl: string): Promise<void> {
    const verifyUrl = `${clientUrl}/verify-email?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Verify your email address - ClientHub',
      html: this.getVerificationTemplate(verifyUrl),
      text: `Welcome to ClientHub! Please verify your email by visiting: ${verifyUrl}`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string, clientUrl: string): Promise<void> {
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: 'Reset your password - ClientHub',
      html: this.getPasswordResetTemplate(resetUrl),
      text: `Reset your password by visiting: ${resetUrl}. This link expires in 1 hour.`,
    });
  }

  async sendInvitationEmail(email: string, organizationName: string, role: string, token: string, clientUrl: string): Promise<void> {
    const inviteUrl = `${clientUrl}/accept-invitation?token=${token}`;
    await this.sendEmail({
      to: email,
      subject: `You're invited to join ${organizationName} on ClientHub`,
      html: this.getInvitationTemplate(organizationName, role, inviteUrl),
      text: `You've been invited to join ${organizationName} as ${role}. Accept here: ${inviteUrl}`,
    });
  }

  async sendWelcomeEmail(email: string, firstName: string, clientUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to ClientHub!',
      html: this.getWelcomeTemplate(firstName, clientUrl),
      text: `Welcome to ClientHub, ${firstName}! Get started at ${clientUrl}`,
    });
  }

  async sendOrgCreatedEmail(email: string, firstName: string, organizationName: string, tempPassword: string, loginUrl: string, payUrl?: string, expiryDate?: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Your ${organizationName} workspace is ready - ClientHub`,
      html: this.getOrgCreatedTemplate(firstName, organizationName, email, loginUrl, payUrl, expiryDate),
      text: `Your ${organizationName} workspace is ready. Sign in at ${loginUrl} with ${email}. Your administrator will provide credentials or use the password reset link.${payUrl ? ` Complete your plan payment here (valid until ${expiryDate}): ${payUrl}` : ''}`,
    });
  }

  async sendProposalEmail(email: string, proposalNumber: string, title: string, total: number, clientUrl: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `New Proposal ${proposalNumber} - ${title || 'ClientHub'}`,
      html: this.getProposalTemplate(proposalNumber, title, total, clientUrl),
      text: `You have a new proposal ${proposalNumber} for $${total}. View at ${clientUrl}`,
    });
  }

  async sendInvoiceEmail(email: string, invoiceNumber: string, total: number, dueAt: Date, clientUrl: string): Promise<void> {
    const dueDate = dueAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    await this.sendEmail({
      to: email,
      subject: `Invoice ${invoiceNumber} - Payment Due ${dueDate}`,
      html: this.getInvoiceTemplate(invoiceNumber, total, dueDate, clientUrl),
      text: `Invoice ${invoiceNumber} for $${total} is due on ${dueDate}. Pay at ${clientUrl}`,
    });
  }

  async sendPaymentReceivedEmail(email: string, paymentNumber: string, amount: number, invoiceNumber: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Payment Received - ${paymentNumber}`,
      html: this.getPaymentReceivedTemplate(paymentNumber, amount, invoiceNumber),
      text: `Payment of $${amount} received for invoice ${invoiceNumber}. Reference: ${paymentNumber}`,
    });
  }

  async sendPaymentReminderEmail(email: string, invoiceNumber: string, amountDue: number, dueAt: Date, clientUrl: string): Promise<void> {
    const dueDate = dueAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    await this.sendEmail({
      to: email,
      subject: `Payment Reminder - Invoice ${invoiceNumber}`,
      html: this.getPaymentReminderTemplate(invoiceNumber, amountDue, dueDate, clientUrl),
      text: `Reminder: Invoice ${invoiceNumber} for $${amountDue} is due on ${dueDate}. Pay at ${clientUrl}`,
    });
  }

  async sendPlanPaymentLinkEmail(email: string, organizationName: string, planName: string, amount: number, currency: string, payUrl: string, expiresAt: Date): Promise<void> {
    const expiryDate = expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const displayAmount = `${currency} ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    await this.sendEmail({
      to: email,
      subject: `Complete your ${planName} subscription for ${organizationName} - ClientHub`,
      html: this.getPlanPaymentLinkTemplate(organizationName, planName, displayAmount, payUrl, expiryDate),
      text: `${organizationName} was created on ClientHub with the ${planName} plan (${displayAmount}). Complete payment here (valid until ${expiryDate}): ${payUrl}`,
    });
  }

  async processSendEmailJob(data: EmailJobData): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`📧 [DEV MODE] Email to ${data.to}: ${data.subject}`);
      return;
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: { email: this.senderEmail, name: this.senderName },
          to: [{ email: data.to }],
          subject: data.subject,
          htmlContent: data.html,
          textContent: data.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Brevo API error: ${response.status} - ${error}`);
      }

      this.logger.log(`✅ Email sent to ${data.to}: ${data.subject}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${data.to}:`, error);
      throw error;
    }
  }

  private getVerificationTemplate(verifyUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Verify your email address</h2>
            <p style="color: #4b5563;">Thanks for signing up! Please click the button below to verify your email address and activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Verify Email</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">Or copy this link: ${verifyUrl}</p>
            <p style="color: #9ca3af; font-size: 14px;">This link expires in 24 hours.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getPasswordResetTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Reset your password</h2>
            <p style="color: #4b5563;">You requested to reset your password. Click the button below to create a new password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">Or copy this link: ${resetUrl}</p>
            <p style="color: #9ca3af; font-size: 14px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getInvitationTemplate(organizationName: string, role: string, inviteUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">You're invited!</h2>
            <p style="color: #4b5563;">You've been invited to join <strong>${organizationName}</strong> as a <strong>${role}</strong> on ClientHub.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Accept Invitation</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">Or copy this link: ${inviteUrl}</p>
            <p style="color: #9ca3af; font-size: 14px;">This invitation expires in 7 days.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getWelcomeTemplate(firstName: string, clientUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome to ClientHub, ${firstName}! 🎉</h2>
            <p style="color: #4b5563;">Your account is ready. Start managing your clients, leads, and deals in one place.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${clientUrl}" style="background: #667eea; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Get Started</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">Need help? Reply to this email or visit our help center.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getProposalTemplate(proposalNumber: string, title: string, total: number, clientUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">New Proposal: ${proposalNumber}</h2>
            <p style="color: #4b5563;">${title ? `Proposal: ${title}` : 'A new proposal has been created for you.'}</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Total Amount</p>
              <p style="margin: 4px 0 0; color: #111827; font-size: 28px; font-weight: 700;">$${total.toLocaleString()}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${clientUrl}" style="background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">View Proposal</a>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getInvoiceTemplate(invoiceNumber: string, total: number, dueDate: string, clientUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Invoice ${invoiceNumber}</h2>
            <p style="color: #4b5563;">An invoice has been generated for your review.</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280;">Amount Due</span>
                <span style="color: #111827; font-weight: 700; font-size: 24px;">$${total.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Due Date</span>
                <span style="color: #dc2626; font-weight: 600;">${dueDate}</span>
              </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${clientUrl}" style="background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Pay Now</a>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPaymentReceivedTemplate(paymentNumber: string, amount: number, invoiceNumber: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #059669; margin-top: 0;">Payment Received ✓</h2>
            <p style="color: #4b5563;">A payment has been recorded for invoice ${invoiceNumber}.</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Amount Received</p>
              <p style="margin: 4px 0 0; color: #059669; font-size: 28px; font-weight: 700;">$${amount.toLocaleString()}</p>
              <p style="margin: 10px 0 0; color: #9ca3af; font-size: 14px;">Reference: ${paymentNumber}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPaymentReminderTemplate(invoiceNumber: string, amountDue: number, dueDate: string, clientUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #d97706; margin-top: 0;">Payment Reminder</h2>
            <p style="color: #4b5563;">This is a friendly reminder that invoice ${invoiceNumber} is due soon.</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="color: #6b7280;">Amount Due</span>
                <span style="color: #111827; font-weight: 700; font-size: 24px;">$${amountDue.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #6b7280;">Due Date</span>
                <span style="color: #dc2626; font-weight: 600;">${dueDate}</span>
              </div>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${clientUrl}" style="background: #d97706; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Pay Now</a>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private getPlanPaymentLinkTemplate(organizationName: string, planName: string, displayAmount: string, payUrl: string, expiryDate: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #111827 0%, #374151 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Complete your subscription payment</h2>
            <p style="color: #4b5563;">An organization <strong>${organizationName}</strong> was created for you with the <strong>${planName}</strong> plan.</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Amount Due</p>
              <p style="margin: 4px 0 0; color: #111827; font-size: 28px; font-weight: 700;">${displayAmount}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${payUrl}" style="background: #059669; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Pay Now</a>
            </div>
            <p style="color: #9ca3af; font-size: 14px;">Or copy this link: ${payUrl}</p>
            <p style="color: #dc2626; font-size: 14px; font-weight: 600;">This link is valid until ${expiryDate} (2 days). After expiry, contact support for a new link.</p>
          </div>
        </body>
      </html>
    `;
  }

  private getOrgCreatedTemplate(firstName: string, organizationName: string, email: string, loginUrl: string, payUrl?: string, expiryDate?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #111827 0%, #374151 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">ClientHub</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb;">
            <h2 style="color: #1f2937; margin-top: 0;">Your workspace is ready, ${firstName}!</h2>
            <p style="color: #4b5563;">An organization <strong>${organizationName}</strong> was created for you. Sign in with your email:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Email</p>
              <p style="margin: 4px 0 12px; color: #111827; font-weight: 600;">${email}</p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Credentials</p>
              <p style="margin: 4px 0 0; color: #111827; font-size: 14px;">Your administrator will share your password securely, or use "Forgot password" to set one.</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: #111827; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Sign In</a>
            </div>
            ${payUrl ? `<div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #065f46; font-weight: 600;">Complete your plan payment</p>
              <p style="margin: 8px 0 16px; color: #047857; font-size: 14px;">Valid until ${expiryDate} (2 days)</p>
              <a href="${payUrl}" style="background: #059669; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Pay Now</a>
            </div>` : `<p style="color: #9ca3af; font-size: 14px;">Please change your password after signing in (Settings → Security).</p>`}
          </div>
        </body>
      </html>
    `;
  }
}