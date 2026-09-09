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
      this.logger.log(`📧 [DEV MODE] Email to ${data.to}: ${data.subject}`);
      this.logger.debug(`HTML: ${data.html}`);
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
}