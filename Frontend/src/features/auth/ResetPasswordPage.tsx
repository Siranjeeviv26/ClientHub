import { useState, useEffect } from 'react';
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
    defaultValues: { password: '', confirmPassword: '' },
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
        toast.success('Password reset! You can now sign in.');
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
      <div className="text-center py-4">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-1.5">Link expired</h2>
        <p className="text-sm text-gray-500 mb-5">This reset link is invalid or has expired.</p>
        <Link to="/forgot-password" className="text-sm text-gray-900 hover:text-gray-700 font-medium">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">New password</h2>
        <p className="mt-1.5 text-sm text-gray-500">Choose something strong and unique</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
            autoComplete="new-password"
            disabled={isLoading}
          />
          {password && (
            <div className="mt-1.5">
              <div className="flex gap-1 mb-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded" style={{
                    backgroundColor: i < strength ? strength <= 2 ? '#ef4444' : strength <= 3 ? '#f59e0b' : '#10b981' : '#e5e7eb',
                  }} />
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                {['Very weak', 'Weak', 'Fair', 'Good', 'Strong'][strength - 1] || 'Enter password'}
              </p>
            </div>
          )}
        </div>

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
          autoComplete="new-password"
          disabled={isLoading}
        />

        <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white" size="lg" loading={isLoading}>
          Reset Password
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Remember your password?{" "}
        <Link to="/login" className="text-gray-900 hover:text-gray-700 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
