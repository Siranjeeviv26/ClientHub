describe('Phase 2 Backend Tests', () => {
  describe('Proposals Module', () => {
    it('should have ProposalStatus enum', () => {
      const { ProposalStatus } = require('./proposals/schemas/proposal.schema');
      expect(ProposalStatus.DRAFT).toBe('draft');
      expect(ProposalStatus.SENT).toBe('sent');
      expect(ProposalStatus.ACCEPTED).toBe('accepted');
      expect(ProposalStatus.REJECTED).toBe('rejected');
      expect(ProposalStatus.EXPIRED).toBe('expired');
    });
  });

  describe('Invoices Module', () => {
    it('should have InvoiceStatus enum', () => {
      const { InvoiceStatus } = require('./invoices/schemas/invoice.schema');
      expect(InvoiceStatus.DRAFT).toBe('draft');
      expect(InvoiceStatus.SENT).toBe('sent');
      expect(InvoiceStatus.PAID).toBe('paid');
      expect(InvoiceStatus.OVERDUE).toBe('overdue');
    });
  });

  describe('Payments Module', () => {
    it('should have PaymentStatus enum', () => {
      const { PaymentStatus } = require('./payments/schemas/payment.schema');
      expect(PaymentStatus.PENDING).toBe('pending');
      expect(PaymentStatus.COMPLETED).toBe('completed');
      expect(PaymentStatus.FAILED).toBe('failed');
      expect(PaymentStatus.REFUNDED).toBe('refunded');
    });

    it('should have PaymentMethod enum', () => {
      const { PaymentMethod } = require('./payments/schemas/payment.schema');
      expect(PaymentMethod.CREDIT_CARD).toBe('credit_card');
      expect(PaymentMethod.BANK_TRANSFER).toBe('bank_transfer');
      expect(PaymentMethod.PAYPAL).toBe('paypal');
    });
  });

  describe('Communications Module', () => {
    it('should have CommunicationType enum', () => {
      const { CommunicationType } = require('./communications/schemas/communication.schema');
      expect(CommunicationType.EMAIL).toBe('email');
      expect(CommunicationType.CALL).toBe('call');
      expect(CommunicationType.MEETING).toBe('meeting');
      expect(CommunicationType.NOTE).toBe('note');
      expect(CommunicationType.MESSAGE).toBe('message');
    });
  });

  describe('Role Permissions', () => {
    it('should have permissions for all new modules', () => {
      const { RolePermissions, Role } = require('./roles/role-permissions.enum');
      
      expect(RolePermissions[Role.ADMIN]).toContain('proposals:create');
      expect(RolePermissions[Role.ADMIN]).toContain('invoices:create');
      expect(RolePermissions[Role.ADMIN]).toContain('payments:create');
      expect(RolePermissions[Role.ADMIN]).toContain('documents:create');
      expect(RolePermissions[Role.ADMIN]).toContain('communications:create');
      expect(RolePermissions[Role.ADMIN]).toContain('events:create');
      
      expect(RolePermissions[Role.SALES]).toContain('proposals:read');
      expect(RolePermissions[Role.SALES]).toContain('invoices:read');
      expect(RolePermissions[Role.SALES]).toContain('payments:read');
      
      expect(RolePermissions[Role.EMPLOYEE]).toContain('proposals:read');
      expect(RolePermissions[Role.EMPLOYEE]).toContain('invoices:read');
      expect(RolePermissions[Role.EMPLOYEE]).toContain('payments:read');
    });
  });

  describe('Email Service Templates', () => {
    it('should have email service with all template methods', () => {
      const emailServiceSource = require('fs').readFileSync(
        require('path').join(__dirname, 'email/email.service.ts'),
        'utf-8'
      );
      
      expect(emailServiceSource).toContain('sendProposalEmail');
      expect(emailServiceSource).toContain('sendInvoiceEmail');
      expect(emailServiceSource).toContain('sendPaymentReceivedEmail');
      expect(emailServiceSource).toContain('sendPaymentReminderEmail');
      expect(emailServiceSource).toContain('getProposalTemplate');
      expect(emailServiceSource).toContain('getInvoiceTemplate');
      expect(emailServiceSource).toContain('getPaymentReceivedTemplate');
      expect(emailServiceSource).toContain('getPaymentReminderTemplate');
    });
  });
});
