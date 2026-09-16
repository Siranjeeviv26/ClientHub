import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      // Role-based redirect: SUPER_ADMIN -> /admin, others -> /dashboard
      // Use stored user (refreshUser has populated it); fallback to /dashboard
      const raw = localStorage.getItem('user');
      let role: string | undefined;
      try { role = raw ? JSON.parse(raw)?.role : undefined; } catch { /* ignore */ }
      navigate(role === 'SUPER_ADMIN' ? '/admin' : '/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Welcome back</h2>
        <p className="mt-1.5 text-sm text-gray-500">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

        <div>
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-3.5 h-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
            <span className="text-xs text-gray-600">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-xs text-gray-600 hover:text-gray-900 font-medium">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white" size="lg" loading={isLoading}>
          Sign in
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        Don't have an account?{' '}
        <Link to="/register" className="text-gray-900 hover:text-gray-700 font-medium">
          Sign up
        </Link>
      </p>
    </div>
  );
}
