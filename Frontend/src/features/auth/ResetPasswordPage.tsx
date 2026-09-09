import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const resetSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);

  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const getPasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[@$!%*?&]/.test(pwd)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      toast.error('Invalid reset link');
    }
  }, [token]);

  const onSubmit = async (data: ResetForm) => {
    if (!token) return;

    setIsLoading(true);
    try {
      const { authApi } = await import('../../api/auth');
      const response = await authApi.resetPassword(token, data.password);
      if (response.success) {
        toast.success('Password reset successfully! You can now sign in.');
        navigate('/login');
      } else {
        toast.error(response.message || 'Reset failed');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error('Invalid or expired reset link');
        setTokenValid(false);
      } else {
        toast.error(error.response?.data?.message || error.message || 'Reset failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="text-center">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h2>
        <p className="text-gray-500 mb-6">This password reset link is invalid or has expired.</p>
        <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Reset your password</h2>
        <p className="mt-2 text-gray-600">Enter your new password below</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div>
          <Input
            label="New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<Lock className="w-5 h-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
            autoComplete="new-password"
            disabled={isLoading}
          />
          {password && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-1.5 rounded transition-colors"
                    style={{
                      backgroundColor:
                        i < strength
                          ? strength <= 2
                            ? '#ef4444'
                            : strength <= 3
                            ? '#f59e0b'
                            : '#10b981'
                          : '#e5e7eb',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][strength - 1] || 'Enter password'}
              </p>
            </div>
          )}
        </div>

        <div>
          <Input
            label="Confirm New Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<Lock className="w-5 h-5" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" loading={isLoading}>
          Reset Password
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-gray-600">
          Remember your password?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}