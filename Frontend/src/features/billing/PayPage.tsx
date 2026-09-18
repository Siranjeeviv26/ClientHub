import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, Loader2, CheckCircle2, AlertTriangle, CreditCard, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingApi } from '../../api/billing';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface PayLinkDetails {
  token: string;
  organizationName: string;
  plan: { name?: string; slug?: string; price?: number; period?: string; features?: string[] };
  amount: number;
  currency: string;
  email: string;
  expiresAt: string;
  key: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PayPage() {
  const { token } = useParams<{ token: string }>();
  const [details, setDetails] = useState<PayLinkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await billingApi.getPayLink(token || '');
        setDetails(res.data || res);
      } catch (e: any) {
        setError(e.response?.data?.message || e.message || 'Invalid or expired payment link');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handlePay = async () => {
    if (!token) return;
    try {
      setPaying(true);
      const orderRes: any = await billingApi.createPayLinkOrder(token);
      const order = orderRes.data || orderRes;
      const ok = await loadRazorpayScript();
      if (!ok || !(window as any).Razorpay) { toast.error('Failed to load Razorpay checkout'); return; }
      const rzp = new (window as any).Razorpay({
        key: order.key || details?.key,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'ClientHub',
        description: `Subscribe ${details?.organizationName} to ${details?.plan?.name}`,
        order_id: order.orderId,
        prefill: { email: details?.email },
        handler: async (resp: any) => {
          try {
            await billingApi.verifyPayLinkPayment(token, {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            setPaid(true);
            toast.success('Payment successful! Subscription activated.');
          } catch (e: any) {
            toast.error(e.response?.data?.message || 'Payment verification failed');
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
        theme: { color: '#111827' },
      });
      rzp.on('payment.failed', () => { toast.error('Payment failed'); setPaying(false); });
      rzp.open();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || 'Failed to initiate payment');
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">ClientHub</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8">
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-sm text-gray-500 mt-3">Loading payment details...</p>
            </div>
          ) : error || !details ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900">Link invalid or expired</h1>
              <p className="text-sm text-gray-500 mt-2">{error || 'This payment link is no longer valid. Links expire 2 days after sending — contact support for a new one.'}</p>
              <Link to="/" className="inline-block mt-6 text-sm font-medium text-primary-600 hover:text-primary-700">Back to home</Link>
            </div>
          ) : paid ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900">Payment successful</h1>
              <p className="text-sm text-gray-500 mt-2">
                {details.organizationName} is now subscribed to <strong>{details.plan?.name}</strong>. You can now sign in.
              </p>
              <Link to="/login" className="inline-block mt-6 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800">Sign in</Link>
            </div>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-widest uppercase text-gray-400">Subscription payment</p>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{details.organizationName}</h1>
              <p className="text-sm text-gray-500 mt-1">{details.plan?.name} plan · billed to {details.email}</p>

              <div className="mt-6 text-center py-5 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Amount due</p>
                <p className="text-4xl font-bold text-gray-900 mt-1">
                  {details.currency} {(Number(details.amount || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              {details.plan?.features && details.plan.features.length > 0 && (
                <ul className="mt-6 space-y-2">
                  {details.plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              )}

              <Button onClick={handlePay} loading={paying} fullWidth size="lg" className="mt-8" leftIcon={<CreditCard className="w-4 h-4" />}>
                Pay Now
              </Button>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-amber-700">
                <Clock className="w-3.5 h-3.5" /> Link expires {new Date(details.expiresAt).toLocaleString()}
              </p>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
