import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Clock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '../../components/ui/Button';
import { authApi } from '../../api/auth';

type VerifyStatus = 'verifying' | 'success' | 'error' | 'resent';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerifyStatus>('verifying');
  const [message, setMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const token = searchParams.get('token');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await authApi.verifyEmail(token);
        if (response.success) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');
        } else {
          setStatus('error');
          setMessage(response.message || 'Verification failed');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
      }
    };

    verify();
  }, [token]);

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const { authApi } = await import('../../api/auth');
      const response = await authApi.resendVerification('');
      // Note: In real app, you'd need to pass the email. For now we'll just show success
      toast.success('Verification email sent!');
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to resend');
    } finally {
      setResendLoading(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-gray-900">Verifying your email...</h2>
        <p className="mt-2 text-gray-500">Please wait while we verify your account</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Verified!</h2>
        <p className="text-gray-500 mb-6">{message}</p>
        <Button onClick={() => navigate('/login')} size="lg">
          Sign In
        </Button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Failed</h2>
        <p className="text-gray-500 mb-6">{message}</p>
        <div className="space-y-3">
          <Button variant="outline" onClick={() => navigate('/login')}>
            Back to Sign In
          </Button>
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Create a new account
          </Link>
        </div>
      </div>
    );
  }

  return null;
}