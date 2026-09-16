import { Outlet, useLocation, Link } from 'react-router-dom';
import { Shield, Lock, UserPlus, KeyRound, ArrowRight, Zap, BarChart3, Users } from 'lucide-react';

const pageContent: Record<string, { title: string; subtitle: string; features: { icon: React.ReactNode; text: string }[] }> = {
  '/login': {
    title: 'Welcome back to ClientHub',
    subtitle: 'Pick up right where you left off — your pipeline is waiting.',
    features: [
      { icon: <Zap className="w-4 h-4" />, text: 'Access your real-time dashboard' },
      { icon: <BarChart3 className="w-4 h-4" />, text: 'Track deals and revenue targets' },
      { icon: <Users className="w-4 h-4" />, text: 'Collaborate with your team instantly' },
    ],
  },
  '/register': {
    title: 'Launch your sales engine today',
    subtitle: 'Set up your workspace in under 2 minutes. No credit card required.',
    features: [
      { icon: <Lock className="w-4 h-4" />, text: 'Secure multi-tenant architecture' },
      { icon: <BarChart3 className="w-4 h-4" />, text: 'Real-time dashboard & analytics' },
      { icon: <Users className="w-4 h-4" />, text: 'Team collaboration & RBAC' },
    ],
  },
  '/forgot-password': {
    title: 'Happens to the best of us',
    subtitle: 'Enter your email and we will send you a reset link in seconds.',
    features: [
      { icon: <Lock className="w-4 h-4" />, text: 'Encrypted end-to-end reset flow' },
      { icon: <KeyRound className="w-4 h-4" />, text: 'Secure token-based verification' },
      { icon: <ArrowRight className="w-4 h-4" />, text: 'Back to your workspace in no time' },
    ],
  },
  '/reset-password': {
    title: 'Set your new password',
    subtitle: 'Choose something strong — we recommend 12+ characters.',
    features: [
      { icon: <Lock className="w-4 h-4" />, text: 'Passwords encrypted at rest' },
      { icon: <KeyRound className="w-4 h-4" />, text: 'One-time use secure tokens' },
      { icon: <Zap className="w-4 h-4" />, text: 'Instant access after reset' },
    ],
  },
};

const fallback = {
  title: 'Build better relationships',
  subtitle: 'ClientHub helps you manage every customer touchpoint in one place.',
  features: [
    { icon: <Lock className="w-4 h-4" />, text: 'Enterprise-grade security' },
    { icon: <BarChart3 className="w-4 h-4" />, text: 'Actionable insights & reporting' },
    { icon: <Users className="w-4 h-4" />, text: 'Built for teams of all sizes' },
  ],
};

export function AuthLayout() {
  const { pathname } = useLocation();
  const content = pageContent[pathname] || fallback;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-[55%] bg-gray-900 flex-col justify-center px-16 xl:px-24 text-white relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-br from-gray-800/50 to-transparent rounded-full blur-3xl opacity-60" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-gradient-to-tl from-gray-800/50 to-transparent rounded-full blur-3xl opacity-40" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-br from-primary-500/10 to-transparent rounded-full blur-3xl opacity-50" />
        </div>
        <div className="max-w-lg relative z-10">
          <Link to="/" className="flex items-center gap-2.5 mb-12">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <span className="font-bold text-2xl">ClientHub</span>
          </Link>
          <h1 className="text-[2.75rem] font-bold mb-4 leading-[1.1] tracking-tight">{content.title}</h1>
          <p className="text-lg text-gray-400 mb-12 leading-relaxed">{content.subtitle}</p>
          <div className="space-y-5">
            {content.features.map((f, i) => (
              <div key={i} className="flex items-center gap-3.5">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  {f.icon}
                </div>
                <span className="text-[15px] text-gray-300">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-8 sm:px-12 lg:px-20 py-8 bg-gray-50">
          <div className="w-full max-w-[400px]">
            <div className="lg:hidden mb-8 text-center">
              <Link to="/" className="inline-flex items-center gap-2.5 mb-4">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">ClientHub</span>
              </Link>
            </div>
            <Outlet />
            <p className="mt-5 text-center text-[11px] text-gray-400">
              &copy; 2026 ClientHub. All rights reserved.
            </p>
          </div>
      </div>
    </div>
  );
}
