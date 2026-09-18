import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, ArrowRight, Menu, X, Star, ChevronDown, Sparkles,
  Users, BarChart3, Workflow, Target, PieChart, Lock,
  LayoutDashboard, Briefcase, FileText, CreditCard, MessageSquare,
  Calendar, Send, CheckCircle2, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import { superAdminApi } from '../../api/super-admin';

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, visible } = useInView(0.3);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 2000;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

const features = [
  { icon: Users, title: 'Client Management', description: 'Track every interaction with a complete 360° view of your clients and contacts.', gradient: 'from-blue-500 to-cyan-400' },
  { icon: BarChart3, title: 'Deal Pipeline', description: 'Visualize stages, track progress, and close deals faster with drag-and-drop.', gradient: 'from-violet-500 to-purple-400' },
  { icon: Workflow, title: 'Smart Automation', description: 'Automate follow-ups, tasks, and never miss an opportunity again.', gradient: 'from-amber-500 to-orange-400' },
  { icon: Target, title: 'Lead Scoring', description: 'AI-powered scoring to prioritize your hottest prospects automatically.', gradient: 'from-rose-500 to-pink-400' },
  { icon: PieChart, title: 'Advanced Analytics', description: 'Real-time dashboards and insights across your entire revenue pipeline.', gradient: 'from-emerald-500 to-teal-400' },
  { icon: Lock, title: 'Enterprise Security', description: 'SOC 2 compliant with RBAC, audit logs, and end-to-end encryption.', gradient: 'from-slate-500 to-gray-400' },
];

const modules = [
  { icon: LayoutDashboard, name: 'Dashboard' },
  { icon: Briefcase, name: 'Clients' },
  { icon: Target, name: 'Leads' },
  { icon: BarChart3, name: 'Deals' },
  { icon: FileText, name: 'Proposals' },
  { icon: CreditCard, name: 'Invoices' },
  { icon: MessageSquare, name: 'Comms' },
  { icon: Calendar, name: 'Calendar' },
  { icon: Send, name: 'Templates' },
];

const steps = [
  { step: '01', title: 'Add your clients', description: 'Import contacts or add them manually. Enrich profiles with interaction history.' },
  { step: '02', title: 'Track your pipeline', description: 'Drag deals through stages. See exactly where every opportunity stands.' },
  { step: '03', title: 'Automate & close', description: 'Set up workflows that follow up and alert your team at the right moment.' },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'VP Sales, TechCorp', content: 'ClientHub increased our pipeline velocity by 40% in the first quarter. The automation alone saved us 10 hours a week.', avatar: 'SC' },
  { name: 'Marcus Rivera', role: 'Head of Growth, ScaleUp', content: 'The multi-tenant architecture lets us manage all subsidiaries from one dashboard. Game changer.', avatar: 'MR' },
  { name: 'Emily Watson', role: 'CEO, StartupXYZ', content: 'From lead capture to invoice — everything is seamless. ClientHub is our revenue backbone.', avatar: 'EW' },
];

const faqs = [
  { q: 'How long is the free trial?', a: '14 days, full access, no credit card required.' },
  { q: 'Can I import data from other CRMs?', a: 'Yes. CSV import and direct integrations with Salesforce, HubSpot, Pipedrive, and more.' },
  { q: 'Is my data secure?', a: 'AES-256 encryption, SOC 2 Type II compliance, data isolated per organization.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees.' },
];

interface Plan {
  _id: string;
  name: string;
  slug: string;
  price: number;
  description?: string;
  features?: string[];
  memberLimit?: number;
  sortOrder?: number;
}

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    (async () => {
      setPlansLoading(true);
      try {
        const res = await superAdminApi.getPublicPlans() as { success: boolean; data: Plan[] };
        const arr = Array.isArray(res?.data) ? res.data : [];
        if (arr.length) { setPlans(arr); return; }
      } catch (e) { console.warn('public/plans via api wrapper failed', e); }
      // Fallback: direct fetch to cover http://localhost/api/v1, :3000, and proxy
      const bases = [
        (import.meta as any).env?.VITE_API_URL,
        '/api/v1',
        'http://localhost:3000/api/v1',
        'http://localhost:5000/api/v1',
        'http://localhost/api/v1',
      ].filter(Boolean) as string[];
      for (const b of bases) {
        try {
          const url = `${b.replace(/\/$/, '')}/public/plans`;
          const r = await fetch(url, { headers: { Accept: 'application/json' } });
          if (!r.ok) continue;
          const j = await r.json();
          const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
          if (arr.length) { setPlans(arr); return; }
        } catch {}
      }
      // Final fallback: keep empty but stop loading
      setPlans([]);
    })().finally(() => setPlansLoading(false));
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMousePos({ x: ((e.clientX - rect.left) / rect.width - 0.5) * 20, y: ((e.clientY - rect.top) / rect.height - 0.5) * 20 });
  }, []);

  const f1 = useInView(); const f2 = useInView(); const f3 = useInView();
  const f4 = useInView(); const f5 = useInView(); const f6 = useInView();
  const t1 = useInView(); const t2 = useInView(); const t3 = useInView();
  const modRef = useInView(0.1); const statRef = useInView(0.2); const ctaRef = useInView(0.2);
  const stepRefs = [useInView(), useInView(), useInView()];

  return (
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      {/* Animated background grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, gray 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Nav */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrollY > 50 ? 'bg-white/70 backdrop-blur-2xl border-b border-gray-200/50 shadow-[0_1px_3px_rgba(0,0,0,0.05)]' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-lg shadow-gray-900/20">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 tracking-tight text-lg">ClientHub</span>
            </button>
            <div className="hidden md:flex items-center gap-1">
              {['Features', 'How it Works', 'Pricing', 'FAQ'].map((item) => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} className="px-4 py-2 text-[13px] font-medium text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200">{item}</a>
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="text-[13px] font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100/80 transition-all">Sign in</Link>
              <Link to="/register" className="text-[13px] font-semibold bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/25 hover:-translate-y-0.5 active:translate-y-0">Get Started Free</Link>
            </div>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-100 px-4 py-4 space-y-1 animate-slide-down">
            {['Features', 'How it Works', 'Pricing', 'FAQ'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">{item}</a>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2 mt-2">
              <Link to="/login" className="px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 text-center">Sign in</Link>
              <Link to="/register" className="px-4 py-3 text-sm bg-gray-900 text-white rounded-xl text-center font-semibold">Get Started Free</Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative pt-28 pb-20 sm:pt-32 sm:pb-32 px-4" onMouseMove={handleMouseMove}>
        {/* Floating orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-gradient-to-br from-gray-100 to-gray-200/50 rounded-full blur-3xl opacity-60 animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-gray-200/40 to-gray-100/20 rounded-full blur-3xl opacity-40 animate-[float_10s_ease-in-out_infinite_reverse]" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-200/60 text-gray-600 text-xs font-medium px-4 py-2 rounded-full mb-8 shadow-sm animate-fade-in hover:shadow-md hover:border-gray-300/60 transition-all duration-300 cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span>Now with AI-powered insights</span>
              <Sparkles className="w-3.5 h-3.5 text-gray-400" />
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight text-gray-900 leading-[0.95] animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Close deals
              <br />
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-gray-900 via-gray-600 to-gray-400 bg-clip-text text-transparent bg-[length:200%_auto] animate-[gradient_3s_linear_infinite]">10x faster</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 12" fill="none"><path d="M2 8C40 2 80 2 100 6C120 10 160 10 198 4" stroke="url(#grad)" strokeWidth="3" strokeLinecap="round" /><defs><linearGradient id="grad" x1="0" y1="0" x2="200" y2="0"><stop offset="0%" stopColor="#111827" /><stop offset="100%" stopColor="#9ca3af" /></linearGradient></defs></svg>
              </span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.2s' }}>
              The modern CRM built for high-velocity sales teams. Manage clients, automate workflows, and crush your quota.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link to="/register" className="group relative inline-flex items-center gap-2.5 bg-gray-900 text-white px-8 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 shadow-xl shadow-gray-900/20 hover:shadow-2xl hover:shadow-gray-900/30 hover:-translate-y-1 active:translate-y-0">
                <span className="relative z-10">Start Free Trial</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
              <a href="#how-it-works" className="group inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 font-medium transition-all duration-300 px-6 py-4 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200/80">
                See how it works
                <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-14 flex items-center justify-center gap-8 text-sm text-gray-400 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex -space-x-3">
                {['bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500'].map((bg, i) => (
                  <div key={i} className={`w-9 h-9 rounded-full ${bg} border-[3px] border-[#fafafa] flex items-center justify-center text-white text-[11px] font-bold shadow-lg transition-transform duration-300 hover:scale-110 hover:z-10`} style={{ zIndex: 5 - i }}>
                    {['S', 'M', 'E', 'J', 'A'][i]}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="font-medium">Trusted by 10,000+ teams</span>
            </div>
          </div>

          {/* Dashboard Preview with tilt */}
          <div className="mt-24 max-w-5xl mx-auto animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div
              className="relative group perspective-[1200px]"
              style={{ transform: `perspective(1200px) rotateY(${mousePos.x * 0.3}deg) rotateX(${-mousePos.y * 0.3}deg)`, transition: 'transform 0.1s ease-out' }}
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-[2rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700" />
              <div className="relative bg-gray-900 rounded-2xl shadow-2xl shadow-gray-900/40 overflow-hidden border border-white/5">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-gray-900">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors cursor-pointer" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors cursor-pointer" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white/5 rounded-lg px-6 py-1.5 text-xs text-white/30 font-mono border border-white/5">app.clienthub.com/dashboard</div>
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    {[
                      { label: 'Total Clients', value: '2,847', change: '+12.5%', color: 'text-emerald-400' },
                      { label: 'Active Deals', value: '186', change: '+8.2%', color: 'text-emerald-400' },
                      { label: 'Pipeline', value: '$2.4M', change: '+23.1%', color: 'text-emerald-400' },
                      { label: 'Win Rate', value: '34%', change: '+5.4%', color: 'text-emerald-400' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:bg-white/[0.06] transition-all duration-300 hover:border-white/10 cursor-default group/card">
                        <p className="text-xs text-white/40 mb-1">{stat.label}</p>
                        <p className="text-xl sm:text-2xl font-bold text-white group-hover/card:scale-105 transition-transform origin-left">{stat.value}</p>
                        <p className={`text-xs ${stat.color} mt-1 flex items-center gap-1`}>
                          <TrendingUp className="w-3 h-3" /> {stat.change}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-4 sm:p-6 border border-white/5">
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-sm font-medium text-white/60">Revenue Overview</p>
                      <div className="flex gap-4 text-xs text-white/30">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white" /> This Year</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/20" /> Last Year</span>
                      </div>
                    </div>
                    {/* Graph */}
                    <div className="relative h-32 sm:h-44 w-full">
                      <style>{`@keyframes draw{to{stroke-dashoffset:0}} @keyframes fadeIn{from{opacity:0} to{opacity:1}} @keyframes popIn{0%{transform:scale(0);opacity:0} 60%{transform:scale(1.4)} 100%{transform:scale(1);opacity:1}} @keyframes riseDrop{0%,100%{transform:translateY(0)} 25%{transform:translateY(-6px)} 50%{transform:translateY(3px)} 75%{transform:translateY(-4px)}}`}</style>
                      <svg viewBox="0 0 420 160" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="white" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="white" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Grid */}
                        <g stroke="rgba(255,255,255,0.06)" strokeWidth="1">
                          <line x1="0" y1="32" x2="420" y2="32" />
                          <line x1="0" y1="64" x2="420" y2="64" />
                          <line x1="0" y1="96" x2="420" y2="96" />
                          <line x1="0" y1="128" x2="420" y2="128" />
                        </g>
                        <g style={{ animation: 'riseDrop 4s ease-in-out infinite 2s' }}>
                        {/* Last Year area (dashed, lighter) */}
                        <path d="M0,110 C30,105 60,95 90,85 C120,75 150,90 180,80 C210,70 240,60 270,65 C300,70 330,85 360,80 C385,77 405,75 420,70 L420,140 L0,140 Z" fill="white" fillOpacity="0.06" style={{ animation: 'fadeIn 0.8s ease-out 0.3s both' }} />
                        <path d="M0,110 C30,105 60,95 90,85 C120,75 150,90 180,80 C210,70 240,60 270,65 C300,70 330,85 360,80 C385,77 405,75 420,70" fill="none" stroke="white" strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'fadeIn 1s ease-out 0.6s both' }} />
                        {/* This Year area */}
                        <path d="M0,90 C30,70 60,65 90,55 C120,45 150,60 180,40 C210,20 240,30 270,35 C300,40 330,55 360,30 C385,18 405,12 420,15 L420,140 L0,140 Z" fill="url(#revenueGradient)" style={{ animation: 'fadeIn 1s ease-out 0.8s both' }} />
                        <path d="M0,90 C30,70 60,65 90,55 C120,45 150,60 180,40 C210,20 240,30 270,35 C300,40 330,55 360,30 C385,18 405,12 420,15" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 700, strokeDashoffset: 700, animation: 'draw 1.8s ease-out 0.2s forwards' }} />
                        {/* Dots for This Year */}
                        {[0, 35, 65, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 420].map((_, i) => {
                          const x = [0, 35, 68, 90, 122, 155, 180, 210, 242, 270, 300, 332, 362, 420][i] || 0;
                          const y = [90, 70, 65, 55, 45, 60, 40, 20, 30, 35, 40, 55, 30, 15][i] || 0;
                          return i % 3 === 0 ? <circle key={i} cx={x} cy={y} r="2.5" fill="white" stroke="rgba(255,255,255,0.3)" strokeWidth="2" style={{ animation: `popIn 0.4s ease-out ${1.6 + i * 0.08}s both` }} /> : null;
                        })}
                        </g>
                      </svg>
                      {/* X axis labels */}
                      <div className="flex justify-between text-[10px] text-white/25 mt-2 px-1">
                        <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="py-14 border-y border-gray-200/50 bg-white/40 backdrop-blur-sm overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em] mb-8">Trusted by leading companies</p>
        </div>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none" />
          <div className="flex animate-marquee w-max">
            {[...['Google', 'Microsoft', 'Stripe', 'Shopify', 'Notion', 'Figma', 'Slack', 'Vercel'], ...['Google', 'Microsoft', 'Stripe', 'Shopify', 'Notion', 'Figma', 'Slack', 'Vercel']].map((logo, i) => (
              <span key={`${logo}-${i}`} className="text-xl font-bold text-gray-200 hover:text-gray-400 transition-all duration-300 cursor-default select-none hover:scale-110 whitespace-nowrap mx-10">{logo}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 sm:py-36 px-4">
        <div className="max-w-7xl mx-auto">
          <div ref={f1.ref} className={`max-w-2xl mx-auto text-center mb-20 transition-all duration-700 ${f1.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Features</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-bold text-gray-900 tracking-tight leading-tight">Everything you need<br className="hidden sm:block" /> to scale revenue</h2>
            <p className="mt-5 text-gray-500 text-lg">Powerful tools designed for modern sales teams.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const featureRefs = [f1, f2, f3, f4, f5, f6];
              const r = featureRefs[i];
              return (
                <div key={f.title} ref={r.ref} className={`group relative p-7 sm:p-8 rounded-2xl border border-gray-200/80 bg-white hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-500 hover:-translate-y-2 hover:border-gray-300/80 cursor-default ${r.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 80}ms` }}>
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2.5 group-hover:text-gray-950 transition-colors">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-gray-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modules Showcase */}
      <section className="py-28 px-4 bg-white/40 backdrop-blur-sm overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div ref={modRef.ref} className={`max-w-2xl mx-auto text-center mb-16 transition-all duration-700 ${modRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Platform</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-bold text-gray-900 tracking-tight">One platform, every tool</h2>
          </div>
        </div>
        <div className="relative overflow-hidden"
          style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="flex animate-marquee-slow w-max py-2">
            {[...modules, ...modules].map((m, i) => (
              <div key={`${m.name}-${i}`} className="flex flex-col items-center gap-3 p-5 mx-2 rounded-2xl border border-gray-200/80 bg-white hover:shadow-xl hover:border-gray-300 transition-all duration-500 cursor-default group hover:-translate-y-2 min-w-[100px]">
                <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center shadow-lg shadow-gray-900/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <m.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors whitespace-nowrap">{m.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-28 sm:py-36 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">How it Works</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-bold text-gray-900 tracking-tight">Up and running in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
            {steps.map((s, i) => {
              const r = stepRefs[i];
              return (
                <div key={s.step} ref={r.ref} className={`relative text-center transition-all duration-700 ${r.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: `${i * 150}ms` }}>
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gray-900 text-white text-2xl font-bold mb-8 shadow-xl shadow-gray-900/25 group hover:scale-110 transition-transform duration-300">
                    {s.step}
                    <div className="absolute -inset-1 rounded-2xl bg-gray-900/20 blur-xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">{s.title}</h3>
                  <p className="text-gray-500 leading-relaxed max-w-sm mx-auto">{s.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section ref={statRef.ref} className="py-24 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite_reverse]" />
        </div>
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 10, suffix: 'K+', label: 'Active Users' },
              { value: 50, suffix: 'M+', label: 'Deals Tracked' },
              { value: 99, suffix: '.9%', label: 'Uptime SLA' },
              { value: 150, suffix: '+', label: 'Integrations' },
            ].map((s, i) => (
              <div key={s.label} className={`text-center transition-all duration-700 ${statRef.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 100}ms` }}>
                <p className="text-4xl sm:text-6xl font-bold text-white tracking-tight">
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </p>
                <p className="text-sm text-white/40 mt-3 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-28 sm:py-36 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Testimonials</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-bold text-gray-900 tracking-tight">Loved by sales teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => {
              const refs = [t1, t2, t3];
              const r = refs[i];
              return (
                <div key={t.name} ref={r.ref} className={`bg-white rounded-2xl border border-gray-200/80 p-8 hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-500 hover:-translate-y-2 group ${r.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${i * 100}ms` }}>
                  <div className="flex gap-1 mb-6">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400 group-hover:scale-110 transition-transform" style={{ transitionDelay: `${j * 30}ms` }} />
                    ))}
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-8 text-[15px]">"{t.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white text-sm font-bold shadow-lg group-hover:scale-110 transition-transform">{t.avatar}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-28 sm:py-36 px-4 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">Pricing</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-bold text-gray-900 tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-5 text-gray-500 text-lg">No hidden fees. Cancel anytime.</p>
          </div>
          {plansLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-500 mt-3">Loading plans...</p>
            </div>
          ) : plans.length > 0 ? (
            <div className={`grid gap-6 max-w-5xl mx-auto ${plans.length === 1 ? 'max-w-md' : plans.length === 2 ? 'md:grid-cols-2 max-w-2xl' : 'md:grid-cols-3'}`}>
              {plans.map((plan, i) => {
                const isPopular = plans.length >= 3 && i === Math.floor(plans.length / 2);
                return (
                  <div key={plan._id} className={`relative rounded-2xl border p-8 bg-white transition-all duration-500 hover:-translate-y-2 ${isPopular ? 'border-gray-900 shadow-2xl shadow-gray-900/15 scale-[1.03]' : 'border-gray-200 hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-300'} opacity-100 translate-y-0`} style={{ transitionDelay: `${i * 100}ms` }}>
                    {isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11px] font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg shadow-gray-900/20">Most Popular</div>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{plan.description || 'For your team'}</p>
                    <div className="mt-7 flex items-baseline gap-1">
                      <span className="text-5xl font-bold text-gray-900 tracking-tight">${plan.price}</span>
                      <span className="text-sm text-gray-400 font-medium">/mo</span>
                    </div>
                    {plan.features && plan.features.length > 0 && (
                      <ul className="mt-8 space-y-3.5">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    {plan.memberLimit && (
                      <ul className="mt-8 space-y-3.5">
                        <li className="flex items-center gap-2.5 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                          Up to {plan.memberLimit} users
                        </li>
                      </ul>
                    )}
                    <Link to="/register" className={`mt-8 block text-center py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${isPopular ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/20 hover:shadow-xl hover:-translate-y-0.5' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:-translate-y-0.5'}`}>
                      Get Started
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">No plans available at the moment.</p>
              <p className="text-xs text-gray-400 mt-1">Please check again later or contact support.</p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-28 sm:py-36 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.2em]">FAQ</span>
            <h2 className="mt-4 text-3xl sm:text-5xl font-bold text-gray-900 tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-200/80 rounded-2xl bg-white overflow-hidden hover:border-gray-300/80 transition-colors duration-300">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-6 text-left group">
                  <span className="text-sm font-medium text-gray-900 pr-4 group-hover:text-gray-950 transition-colors">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-gray-600' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-6 pb-6">
                    <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef.ref} className="py-28 sm:py-36 px-4">
        <div className="max-w-7xl mx-auto">
          <div className={`relative bg-gray-900 rounded-3xl p-14 sm:p-24 text-center overflow-hidden transition-all duration-700 ${ctaRef.visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800" />
            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite_reverse]" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">Ready to close<br />more deals?</h2>
              <p className="mt-6 text-white/50 text-lg max-w-xl mx-auto">Join 10,000+ sales teams using ClientHub to accelerate their pipeline and boost revenue.</p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register" className="group relative inline-flex items-center gap-2.5 bg-white text-gray-900 px-9 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 shadow-xl shadow-black/20 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                <a href="#" className="text-sm text-white/40 hover:text-white/70 font-medium transition-colors px-6 py-4">Talk to sales</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200/50 bg-white/40 backdrop-blur-sm py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
            <div className="lg:col-span-2">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shadow-lg shadow-gray-900/20">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-lg">ClientHub</span>
              </button>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs">The modern B2B CRM platform for high-velocity sales teams.</p>
              <div className="flex items-center gap-5 mt-7">
                {['Privacy', 'Terms', 'Security'].map((link) => (
                  <a key={link} href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium">{link}</a>
                ))}
              </div>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'API'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Contact', 'Partners'] },
              { title: 'Support', links: ['Help Center', 'Documentation', 'Status', 'Community'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-semibold text-gray-900 mb-5">{col.title}</h4>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link}><a href="#" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">{link}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14 pt-8 border-t border-gray-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400">&copy; 2026 ClientHub. All rights reserved.</p>
            <div className="flex items-center gap-5">
              <a href="#" className="text-gray-300 hover:text-gray-500 transition-all duration-300 hover:scale-110"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg></a>
              <a href="#" className="text-gray-300 hover:text-gray-500 transition-all duration-300 hover:scale-110"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg></a>
              <a href="#" className="text-gray-300 hover:text-gray-500 transition-all duration-300 hover:scale-110"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
