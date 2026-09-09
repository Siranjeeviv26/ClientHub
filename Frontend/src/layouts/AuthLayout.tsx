import { Outlet } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 flex-col items-center justify-center p-12 text-white">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-8">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">ClientHub</h1>
          <p className="text-xl text-primary-100 mb-8">
            The modern B2B SaaS CRM platform for managing clients, leads, deals, and tasks.
          </p>
          <div className="space-y-4 text-primary-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span>Secure multi-tenant architecture</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span>Real-time dashboard & analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span>Team collaboration & RBAC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">ClientHub</h1>
            <p className="text-gray-500 mt-2">Sign in to your account</p>
          </div>
          <div className="bg-white rounded-2xl shadow-card border border-gray-200 p-8">
            <Outlet />
          </div>
          <p className="mt-6 text-center text-sm text-gray-500">
            © 2024 ClientHub. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}