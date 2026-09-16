import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&]/, 'Password must contain at least one special character'),
  confirmPassword: z.string(),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Organization name too long'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', password: '', confirmPassword: '', organizationName: '',
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

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const { authApi } = await import('../../api/auth');
      const response = await authApi.register({
        email: data.email, password: data.password,
        firstName: data.firstName, lastName: data.lastName,
        organizationName: data.organizationName,
      });
      if (response.success) {
        toast.success('Account created! Please sign in.');
        navigate('/login');
      } else {
        toast.error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-1 text-sm text-gray-500">Start managing clients and deals today</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-2.5">
          <Input
            label="First Name"
            placeholder="John"
            leftIcon={<User className="w-4 h-4" />}
            error={errors.firstName?.message}
            {...register('firstName')}
            disabled={isLoading}
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            leftIcon={<User className="w-4 h-4" />}
            error={errors.lastName?.message}
            {...register('lastName')}
            disabled={isLoading}
          />
        </div>

        <Input
          label="Email"
          type="email"
          placeholder="you@company.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
          autoComplete="email"
          disabled={isLoading}
        />

        <Input
          label="Organization"
          placeholder="Acme Corporation"
          leftIcon={<Building2 className="w-4 h-4" />}
          error={errors.organizationName?.message}
          {...register('organizationName')}
          disabled={isLoading}
        />

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
            <div className="mt-1">
              <div className="flex gap-0.5 mb-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex-1 h-1 rounded" style={{
                    backgroundColor: i < strength ? strength <= 2 ? '#ef4444' : strength <= 3 ? '#f59e0b' : '#10b981' : '#e5e7eb',
                  }} />
                ))}
              </div>
              <p className="text-[10px] text-gray-400">
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

        <div className="flex items-start gap-1.5">
          <input type="checkbox" id="terms" required className="mt-0.5 w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
          <label htmlFor="terms" className="text-[11px] text-gray-500 leading-snug">
            I agree to the{' '}
            <Link to="/terms" className="text-gray-900 hover:text-gray-700">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-gray-900 hover:text-gray-700">Privacy Policy</Link>
          </label>
        </div>

        <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white" size="lg" loading={isLoading}>
          Create Account
        </Button>
      </form>

      <p className="mt-3 text-center text-xs text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-gray-900 hover:text-gray-700 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
