import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { QUEUE_SERVICE, QueueService } from './queue.interface';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/schemas/notification.schema';

@Module({
  imports: [EmailModule, NotificationsModule],
})
export class QueueWorkerModule implements OnModuleInit {
  private readonly logger = new Logger(QueueWorkerModule.name);

  constructor(
    @Inject(QUEUE_SERVICE) private queueService: QueueService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    this.logger.log('Registering queue workers...');

    // Email worker
    this.queueService.process('send-email', 5, async (job) => {
      this.logger.debug(`Processing email job ${job.id}`);
      await this.emailService.processSendEmailJob(job.data);
      return { success: true };
    });

    // Notification worker
    this.queueService.process('notification', 10, async (job) => {
      this.logger.debug(`Processing notification job ${job.id}`);
      await this.notificationsService.processNotificationJob(job.data);
      return { success: true };
    });

    // Task due reminder worker
    this.queueService.process('task-due-reminder', 5, async (job) => {
      this.logger.debug(`Processing task reminder job ${job.id}`);
      const { organizationId, userId, taskId, taskTitle, dueDate } = job.data;
      await this.notificationsService.notifyTaskDueSoon(
        organizationId, userId, taskId, taskTitle, new Date(dueDate),
      );
      return { success: true };
    });

    // Task assigned worker
    this.queueService.process('task-assigned', 5, async (job) => {
      this.logger.debug(`Processing task assigned job ${job.id}`);
      const { organizationId, userId, taskId, taskTitle, triggeredBy } = job.data;
      await this.notificationsService.notifyTaskAssigned(
        organizationId, userId, taskId, taskTitle, triggeredBy,
      );
      return { success: true };
    });

    // Event reminder worker
    this.queueService.process('reminders', 5, async (job) => {
      this.logger.debug(`Processing reminder job ${job.id}`);
      const { organizationId, userId, eventId, eventTitle, eventTime, type } = job.data;
      await this.notificationsService.createNotification({
        organizationId,
        userId,
        type: NotificationType.TASK_DUE_SOON,
        title: `Reminder: ${eventTitle}`,
        message: `Starting at ${new Date(eventTime).toLocaleTimeString()}`,
        relatedEntity: { type: 'event', id: eventId, name: eventTitle },
      });
      return { success: true };
    });

    // PDF generation worker
    this.queueService.process('pdf-generation', 2, async (job) => {
      this.logger.debug(`Processing PDF generation job ${job.id}`);
      // PDF generation is handled synchronously in the service
      // This worker exists for future async PDF generation needs
      return { success: true };
    });

    this.logger.log('✅ Queue workers registered');
  }
}
