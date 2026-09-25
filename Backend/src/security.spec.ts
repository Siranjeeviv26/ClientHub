import * as fs from 'fs';
import * as path from 'path';

describe('Security smoke tests (L-07)', () => {
  const read = (rel: string) =>
    fs.readFileSync(path.join(__dirname, rel), 'utf-8');

  describe('Secrets hygiene', () => {
    it('does not contain hardcoded Razorpay test secrets in tracked source', () => {
      const files = [
        'config/configuration.ts',
        'config/validation.schema.ts',
        'billing/billing.service.ts',
        'billing/billing.controller.ts',
        'billing/payment-providers/razorpay.provider.ts',
        'main.ts',
        'seed/seed.service.ts',
      ];
      for (const f of files) {
        const src = read(f);
        expect(src).not.toMatch(/rzp_test_[A-Za-z0-9]{8,}/);
        expect(src).not.toMatch(/D0rGM1Nhv5IRRaDaTkNnGFOP/);
      }
    });

    it('JWT secrets are not hardcoded in configuration defaults', () => {
      const src = read('config/configuration.ts');
      expect(src).not.toMatch(/accessSecret:\s*['"][^'"]{8,}['"]/);
      expect(src).not.toMatch(/refreshSecret:\s*['"][^'"]{8,}['"]/);
    });
  });

  describe('Authorization guards', () => {
    it('seed endpoint requires SUPER_ADMIN role', () => {
      const src = read('seed/seed.controller.ts');
      expect(src).toMatch(/@Roles\(\s*['"]SUPER_ADMIN['"]\s*\)/);
    });

    it('plans admin endpoints are Super Admin only (not org ADMIN)', () => {
      const src = read('plans/plans.controller.ts');
      expect(src).toMatch(/SuperAdminGuard/);
      expect(src).not.toMatch(/@Roles\(\s*['"]ADMIN['"]\s*\)/);
    });

    it('organization delete requires password confirmation DTO', () => {
      const src = read('organizations/organizations.controller.ts');
      expect(src).toMatch(/DeleteOrganizationDto/);
      expect(src).toMatch(/dto\.password/);
    });

    it('billing razorpay key endpoint is not public', () => {
      const src = read('billing/billing.controller.ts');
      const keyBlock = src.slice(src.indexOf('razorpay/key') - 80, src.indexOf('razorpay/key') + 120);
      expect(keyBlock).not.toMatch(/@Public\(\)/);
    });
  });

  describe('Security headers and bootstrap', () => {
    it('Helmet CSP is enabled for API', () => {
      const src = read('main.ts');
      expect(src).toMatch(/contentSecurityPolicy/);
      expect(src).not.toMatch(/contentSecurityPolicy:\s*false/);
    });

    it('trust proxy is opt-in via TRUST_PROXY env', () => {
      const src = read('main.ts');
      expect(src).toMatch(/TRUST_PROXY/);
      // Must not unconditionally trust proxy (spoofable client IPs)
      expect(src).not.toMatch(/\(app as any\)\.set\(\s*['"]trust proxy['"]\s*,\s*1\s*\);\s*\n\s*\n\s*\/\/ Global prefix/);
    });

    it('cookie parser is enabled for httpOnly auth cookies', () => {
      const src = read('main.ts');
      expect(src).toMatch(/cookieParser\(\)/);
    });

    it('CORS does not allow wildcard vercel origins', () => {
      const src = read('main.ts');
      expect(src).not.toMatch(/\*\.vercel\.app['"]/);
    });
  });

  describe('Token storage (M-12)', () => {
    it('frontend does not persist access/refresh tokens in localStorage', () => {
      const feApi = fs.readFileSync(
        path.join(__dirname, '../../Frontend/src/services/api.ts'),
        'utf-8',
      );
      expect(feApi).not.toMatch(/localStorage\.setItem\(\s*['"]accessToken['"]/);
      expect(feApi).not.toMatch(/localStorage\.setItem\(\s*['"]refreshToken['"]/);
      expect(feApi).not.toMatch(/localStorage\.getItem\(\s*['"]accessToken['"]/);
      expect(feApi).toMatch(/withCredentials:\s*true/);
      expect(feApi).toMatch(/accessTokenMemory/);
    });

    it('JWT strategy accepts httpOnly cookie', () => {
      const src = read('auth/strategies/jwt.strategy.ts');
      expect(src).toMatch(/fromCookieOrHeader|cookies\?\.accessToken/);
    });

    it('auth controller sets auth cookies on login/refresh', () => {
      const src = read('auth/auth.controller.ts');
      expect(src).toMatch(/setAuthCookies/);
      expect(src).toMatch(/clearAuthCookies/);
    });
  });

  describe('Webhook fail-closed (C-04)', () => {
    it('billing service rejects missing webhook signature/secret', () => {
      const src = read('billing/billing.service.ts');
      expect(src).toMatch(/Missing webhook signature/i);
      expect(src).toMatch(/Webhook secret not configured/i);
    });
  });

  describe('Audit logging (M-15/L-01)', () => {
    it('interceptor logs sensitive GET reads', () => {
      const src = read('audit-logs/audit-log.interceptor.ts');
      expect(src).toMatch(/GET:\s*['"]read['"]/);
      expect(src).toMatch(/hasEntityId|sensitiveReadEntities/);
    });
  });

  describe('Sort allowlists (M-05/L-06)', () => {
    it('communications sort field is allowlisted', () => {
      const src = read('communications/communications.service.ts');
      expect(src).toMatch(/ALLOWED_SORT_FIELDS/);
      expect(src).not.toMatch(/\[sortParts\[0\]\]\s*:/);
    });

    it('documents sort field is allowlisted', () => {
      const src = read('documents/documents.service.ts');
      expect(src).toMatch(/allowedSortKeys/);
    });
  });

  describe('Password hashing (H-01)', () => {
    it('refresh tokens use SHA-256 not bcrypt hashSync', () => {
      const src = read('auth/auth.service.ts');
      expect(src).toMatch(/createHash\(\s*['"]sha256['"]\s*\)/);
      expect(src).not.toMatch(/bcrypt\.hashSync\(\s*refreshToken/);
    });
  });

  describe('Super-admin passwords (C-05)', () => {
    it('temporary password is not returned in super-admin service response', () => {
      const src = read('super-admin/super-admin.service.ts');
      expect(src).not.toMatch(/temporaryPassword:/);
    });
  });
});
