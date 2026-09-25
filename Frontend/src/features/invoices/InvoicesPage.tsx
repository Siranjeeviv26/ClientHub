import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Trash,
  PlusCircle,
  Send,
  Eye,
  CheckCircle2,
  Download,
  Printer,
} from 'lucide-react';
import { Column, Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { invoicesApi, Invoice, InvoiceItem, InvoiceStats } from '../../api/invoices';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { clientsApi } from '../../api/clients';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useOrganization } from '../../contexts/OrganizationContext';

interface InvoiceForm {
  clientId: string;
  title: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  taxRate: number;
  discount: number;
  notes: string;
  terms: string;
  dueAt: string;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_BADGE: Record<string, { variant: 'gray' | 'primary' | 'success' | 'danger' | 'warning'; icon: React.ReactNode }> = {
  draft: { variant: 'gray', icon: <FileText className="w-3 h-3" /> },
  sent: { variant: 'primary', icon: <Send className="w-3 h-3" /> },
  viewed: { variant: 'primary', icon: <Eye className="w-3 h-3" /> },
  paid: { variant: 'success', icon: <CheckCircle2 className="w-3 h-3" /> },
  overdue: { variant: 'danger', icon: <AlertTriangle className="w-3 h-3" /> },
  cancelled: { variant: 'warning', icon: <X className="w-3 h-3" /> },
  partially_paid: { variant: 'warning', icon: <Clock className="w-3 h-3" /> },
};

const emptyItem = { description: '', quantity: 1, unitPrice: 0 };

function PaymentProgress({ paid, total, status }: { paid: number; total: number; status: string }) {
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const isPaid = status === 'paid';
  const isOverdue = status === 'overdue';
  const barColor = isPaid ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : pct > 0 ? 'bg-amber-500' : 'bg-gray-200';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">{formatCurrency(paid)}</span>
        <span className="font-medium text-gray-900">{formatCurrency(total)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function DaysUntilDue({ dueAt, status }: { dueAt: string; status: string }) {
  const due = new Date(dueAt);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (status === 'paid') {
    return <span className="text-xs text-emerald-600 font-medium">Paid</span>;
  }
  if (diff < 0) {
    return <span className="text-xs text-red-600 font-semibold">Overdue by {Math.abs(diff)}d</span>;
  }
  if (diff === 0) {
    return <span className="text-xs text-amber-600 font-medium">Due today</span>;
  }
  if (diff <= 7) {
    return <span className="text-xs text-amber-600">Due in {diff}d</span>;
  }
  return <span className="text-xs text-gray-500">Due in {diff}d</span>;
}

const INVOICE_CSS = `
  @page { margin: 18mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 0; background: #fff; }
  .invoice-doc { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 40px auto; max-width: 800px; padding: 0 24px; background: #fff; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px; border-bottom: 3px solid #111827; padding-bottom: 18px; }
  .head-left { flex: 1 1 auto; min-width: 0; }
  .head-right { flex: 0 0 auto; text-align: right; }
  .head-logo { display: block; height: auto; width: auto; max-height: 64px; max-width: 230px; object-fit: contain; object-position: left top; margin-bottom: 10px; }
  .co { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  h1 { font-size: 30px; margin: 0 0 4px; letter-spacing: -0.02em; }
  .meta { color: #6b7280; font-size: 13px; line-height: 1.7; }
  .meta.right { text-align: right; }
  .meta strong { color: #111827; }
  .status-text { font-weight: 700; color: #111827; }
  .status-text.status-paid { color: #047857; }
  .status-text.status-overdue { color: #b91c1c; }
  .status-text.status-sent, .status-text.status-viewed { color: #1d4ed8; }
  .status-text.status-cancelled, .status-text.status-partially_paid { color: #b45309; }
  .status-text.status-draft { color: #4b5563; }
  .bill { display: flex; justify-content: space-between; gap: 32px; margin: 24px 0; font-size: 13px; }
  .bill h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #9ca3af; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 2px solid #e5e7eb; padding: 8px 10px; }
  tbody td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  thead th.num { text-align: right; }
  .totals { width: 300px; margin: 18px 0 0 auto; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 10px; }
  .totals .grand { border-top: 2px solid #111827; font-weight: 700; font-size: 16px; margin-top: 6px; padding-top: 10px; }
  .notes { margin-top: 32px; font-size: 12px; color: #6b7280; line-height: 1.7; }
  .notes strong { color: #111827; display: block; margin-bottom: 2px; }
`;

const DEFAULT_INVOICE_NOTES =
  'Thank you for your business! If you have any questions or need clarification about this invoice, please contact us using the details above.';

const buildDefaultTerms = (inv: Invoice): string =>
  `Payment is due by ${formatDate(inv.dueAt)}. Please quote ${inv.invoiceNumber} as the payment reference. Bank transfer or card payment is accepted. Overdue balances may incur a 1.5% monthly interest charge.`;

const getInvoiceNotes = (inv: Invoice): string => inv.notes?.trim() || DEFAULT_INVOICE_NOTES;
const getInvoiceTerms = (inv: Invoice): string => inv.terms?.trim() || buildDefaultTerms(inv);

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [clients, setClients] = useState<{ _id: string; companyName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  const { organization } = useOrganization();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SALES';
  const canDelete = user?.role === 'ADMIN';

  const savedCompany = ((organization as any)?.settings?.company || {}) as Record<string, string>;
  const companyDetails = {
    name: organization?.name || '',
    logo: (organization as any)?.logo || '',
    address: savedCompany.address || '',
    email: savedCompany.email || '',
    phone: savedCompany.phone || '',
    website: savedCompany.website || '',
  };

  const [form, setForm] = useState<InvoiceForm>({
    clientId: '',
    title: '',
    items: [{ ...emptyItem }],
    taxRate: 0,
    discount: 0,
    notes: '',
    terms: '',
    dueAt: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (search) params.search = search;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

      const [listRes, statsRes, clientsRes] = await Promise.all([
        invoicesApi.getAll(params),
        invoicesApi.getStats(),
        clientsApi.getAll({ limit: 100 }),
      ]);

      if (listRes.success) {
        setInvoices(listRes.data.items);
        setPagination(prev => ({
          ...prev,
          total: listRes.data.pagination.total,
          totalPages: listRes.data.pagination.totalPages,
        }));
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (clientsRes.success) {
        setClients(clientsRes.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchData();
  }, [pagination.page, search, statusFilter]);

  const calcItemTotal = (qty: number, price: number) => qty * price;
  const calcSubtotal = () => form.items.reduce((sum, item) => sum + calcItemTotal(item.quantity, item.unitPrice), 0);
  const calcTax = () => calcSubtotal() * (form.taxRate / 100);
  const calcDiscount = () => calcSubtotal() * (form.discount / 100);
  const calcTotal = () => calcSubtotal() + calcTax() - calcDiscount();

  const updateItem = (index: number, field: string, value: string | number) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { ...emptyItem }] }));

  const removeItem = (index: number) => {
    setForm(prev => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, i) => i !== index) };
    });
  };

  const resetForm = () => {
    setForm({ clientId: '', title: '', items: [{ ...emptyItem }], taxRate: 0, discount: 0, notes: '', terms: '', dueAt: '' });
  };

  const openCreateModal = () => {
    setEditingInvoice(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setForm({
      clientId: (invoice.clientId as any)?._id || (typeof invoice.clientId === 'string' ? invoice.clientId : ''),
      title: invoice.title || '',
      items: invoice.items?.length
        ? invoice.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice }))
        : [{ ...emptyItem }],
      taxRate: invoice.taxRate || 0,
      discount: invoice.discountRate || 0,
      notes: invoice.notes || '',
      terms: invoice.terms || '',
      dueAt: invoice.dueAt ? new Date(invoice.dueAt).toISOString().split('T')[0] : '',
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async () => {
    if (!form.clientId) { toast.error('Client is required'); return; }
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.dueAt) { toast.error('Due date is required'); return; }
    if (form.items.some(i => !i.description.trim())) { toast.error('All items must have a description'); return; }

    setIsSubmitting(true);
    try {
      const payload: any = {
        clientId: form.clientId,
        title: form.title,
        items: form.items.map(i => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: calcItemTotal(i.quantity, i.unitPrice),
        })),
        taxRate: form.taxRate,
        discountRate: form.discount,
        notes: form.notes,
        terms: form.terms,
        dueAt: form.dueAt,
      };

      if (editingInvoice) {
        const res = await invoicesApi.update(editingInvoice._id, payload);
        if (res.success) { toast.success('Invoice updated'); setModalOpen(false); fetchData(); }
      } else {
        const res = await invoicesApi.create(payload);
        if (res.success) { toast.success('Invoice created'); setModalOpen(false); fetchData(); }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await invoicesApi.delete(deleteConfirm._id);
      toast.success('Invoice deleted');
      setDeleteConfirm(null);
      fetchData();
    } catch {
      toast.error('Failed to delete invoice');
    }
  };

  const escapeHtml = (value: string) =>
    String(value).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
    );

  const buildInvoiceBody = (inv: Invoice): string => {
    const clientName = (inv.clientId as any)?.companyName || '—';
    const rows = (inv.items || [])
      .map(
        (i) => `<tr>
          <td>${escapeHtml(i.description)}</td>
          <td class="num">${i.quantity}</td>
          <td class="num">${formatCurrency(i.unitPrice)}</td>
          <td class="num">${formatCurrency(i.total ?? i.quantity * i.unitPrice)}</td>
        </tr>`,
      )
      .join('');
    const discount = inv.discountAmount ? `<tr><td>Discount</td><td class="num">-${formatCurrency(inv.discountAmount)}</td></tr>` : '';
    const companyLines = [
      companyDetails.address ? escapeHtml(companyDetails.address).replace(/\n/g, '<br/>') : '',
      companyDetails.phone ? escapeHtml(companyDetails.phone) : '',
      companyDetails.email ? escapeHtml(companyDetails.email) : '',
      companyDetails.website ? escapeHtml(companyDetails.website) : '',
    ].filter(Boolean);
    const fromName = companyDetails.name || inv.createdBy?.name || '';
    const fromSub =
      companyDetails.name && inv.createdBy?.name
        ? [inv.createdBy.name, inv.createdBy.email].filter(Boolean).map(escapeHtml).join(' &middot; ')
        : escapeHtml(inv.createdBy?.email || '');
    const statusText = inv.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    return `
  <div class="invoice-doc">
    <div class="head">
      <div class="head-left">
        ${companyDetails.logo ? `<img src="${escapeHtml(companyDetails.logo)}" alt="${escapeHtml(companyDetails.name)}" class="head-logo" />` : ''}
        ${companyDetails.name ? `<div class="co">${escapeHtml(companyDetails.name)}</div>` : ''}
        <div class="meta">
          ${companyLines.join('<br/>')}
        </div>
      </div>
      <div class="head-right">
        <h1>INVOICE</h1>
        <div class="meta right">${escapeHtml(inv.invoiceNumber)}</div>
        <div class="meta right" style="margin-top:8px">
          <strong>Status</strong> <span class="status-text status-${escapeHtml(inv.status)}">${escapeHtml(statusText)}</span><br/>
          <strong>Issued</strong> ${escapeHtml(inv.issuedAt ? formatDate(inv.issuedAt) : formatDate(inv.createdAt))}<br/>
          <strong>Due</strong> ${escapeHtml(formatDate(inv.dueAt))}
        </div>
      </div>
    </div>
    <div class="bill">
      <div>
        <h3>Billed To</h3>
        <strong>${escapeHtml(clientName)}</strong>
      </div>
      <div style="text-align:right">
        <h3>From</h3>
        <strong>${escapeHtml(fromName)}</strong>${fromSub ? `<br/>${fromSub}` : ''}
      </div>
    </div>
    ${inv.title ? `<p style="font-size:15px;font-weight:600;margin:0 0 12px">${escapeHtml(inv.title)}</p>` : ''}
    <table>
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${formatCurrency(inv.subtotal)}</span></div>
      ${inv.taxRate ? `<div><span>Tax (${inv.taxRate}%)</span><span>${formatCurrency(inv.taxAmount)}</span></div>` : ''}
      ${discount}
      <div class="grand"><span>Total</span><span>${formatCurrency(inv.total)}</span></div>
      ${inv.amountPaid ? `<div><span>Paid</span><span>${formatCurrency(inv.amountPaid)}</span></div>` : ''}
      ${inv.amountDue > 0 && inv.status !== 'draft' ? `<div><span>Amount Due</span><span>${formatCurrency(inv.amountDue)}</span></div>` : ''}
    </div>
    <div class="notes">
      <strong>Notes</strong>${escapeHtml(getInvoiceNotes(inv))}
      <strong style="margin-top:10px">Terms</strong>${escapeHtml(getInvoiceTerms(inv))}
    </div>
  </div>`;
  };

  const buildInvoiceHtml = (inv: Invoice): string => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(inv.invoiceNumber)} — ${escapeHtml(inv.title || 'Invoice')}</title>
<style>
${INVOICE_CSS}
</style>
</head>
<body>${buildInvoiceBody(inv)}</body>
</html>`;

  const handleDownloadInvoice = async (inv: Invoice) => {
    try {
      const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')]);

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:0;left:-10000px;width:800px;background:#fff;';
      const styleEl = document.createElement('style');
      styleEl.textContent = INVOICE_CSS;
      container.appendChild(styleEl);
      const wrap = document.createElement('div');
      wrap.innerHTML = buildInvoiceBody(inv);
      container.appendChild(wrap.firstElementChild || wrap);
      document.body.appendChild(container);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      } finally {
        container.remove();
      }

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidthMm = 210;
      const pxPerPage = Math.max(1, Math.floor(canvas.width * (297 / 210)));
      let offsetY = 0;
      let page = 0;
      while (offsetY < canvas.height) {
        const sliceHeight = Math.min(pxPerPage, canvas.height - offsetY);
        const chunk = document.createElement('canvas');
        chunk.width = canvas.width;
        chunk.height = sliceHeight;
        const ctx = chunk.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, chunk.width, chunk.height);
        ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
        if (page > 0) pdf.addPage();
        const heightMm = (sliceHeight / canvas.width) * pageWidthMm;
        pdf.addImage(chunk.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidthMm, heightMm);
        offsetY += sliceHeight;
        page += 1;
      }

      pdf.save(`${inv.invoiceNumber}.pdf`);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('PDF generation failed — use Print / Save PDF instead');
    }
  };

  const handlePrintInvoice = (inv: Invoice) => {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Popup blocked — allow popups to print or save as PDF');
      return;
    }
    win.document.write(buildInvoiceHtml(inv));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      width: '140px',
      render: (invoice) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 text-sm block">{invoice.invoiceNumber}</span>
            <span className="text-xs text-gray-400 truncate block max-w-[120px]">{invoice.title || 'Untitled'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'clientId',
      header: 'Client',
      width: '140px',
      render: (invoice) => (
        <span className="text-sm text-gray-700 truncate block max-w-[140px]">
          {(invoice.clientId as any)?.companyName || '—'}
        </span>
      ),
    },
    {
      key: 'total',
      header: 'Amount',
      width: '180px',
      render: (invoice) => (
        <PaymentProgress paid={invoice.amountPaid || 0} total={invoice.total} status={invoice.status} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (invoice) => {
        const config = STATUS_BADGE[invoice.status] || { variant: 'gray' as const, icon: null };
        return (
          <Badge variant={config.variant} size="sm" className="capitalize gap-1">
            {config.icon}
            {invoice.status.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      key: 'dueAt',
      header: 'Due',
      width: '110px',
      className: 'hidden md:table-cell',
      render: (invoice) => (
        <div>
          <span className="text-sm text-gray-700 block">{formatDate(invoice.dueAt)}</span>
          <DaysUntilDue dueAt={invoice.dueAt} status={invoice.status} />
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '132px',
      render: (invoice) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPreviewInvoice(invoice)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDownloadInvoice(invoice)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => openEditModal(invoice)}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          {canDelete && (
            <button
              onClick={() => setDeleteConfirm(invoice)}
              className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statCards = [
    { label: 'Total Invoices', value: stats?.total ?? 0, icon: FileText, bg: 'bg-gray-900' },
    { label: 'Revenue', value: formatCurrency(stats?.totalRevenue ?? 0), icon: DollarSign, bg: 'bg-gray-900' },
    { label: 'Outstanding', value: formatCurrency(stats?.outstanding ?? 0), icon: Clock, bg: 'bg-gray-900' },
    { label: 'Overdue', value: stats?.overdue ?? 0, icon: AlertTriangle, bg: 'bg-gray-900' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-1">Track invoices and manage payments</p>
        </div>
        {canCreate && (
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            New Invoice
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200/70 shadow-sm p-3.5 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <span className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0 shadow-sm`}>
              <stat.icon className="w-4 h-4 text-white" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 truncate">{stat.label}</p>
              <p className="text-lg font-bold tracking-tight text-gray-900 leading-none mt-0.5 tabular-nums" style={{ letterSpacing: '-0.02em' }}>
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="w-full h-9 rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-8 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all hover:border-gray-300"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setSearch(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="w-full sm:w-[160px] shrink-0">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={invoices}
            keyExtractor={(invoice) => invoice._id}
            emptyMessage="No invoices found. Create your first invoice to get started."
            hoverable
            striped
          />
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">{pagination.page} / {pagination.totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingInvoice(null); }}
        title={editingInvoice ? 'Edit Invoice' : 'New Invoice'}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditingInvoice(null); }}>Cancel</Button>
            <Button onClick={handleSubmitForm} loading={isSubmitting}>
              {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Client *"
              options={[{ value: '', label: 'Select client' }, ...clients.map(c => ({ value: c._id, label: c.companyName }))]}
              value={form.clientId}
              onChange={(e) => setForm(prev => ({ ...prev, clientId: e.target.value }))}
            />
            <Input label="Title *" placeholder="Invoice title" value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} />
            <Input label="Due Date *" type="date" value={form.dueAt} onChange={(e) => setForm(prev => ({ ...prev, dueAt: e.target.value }))} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Line Items</label>
              <Button variant="ghost" size="sm" onClick={addItem} leftIcon={<PlusCircle className="w-4 h-4" />} className="text-xs">
                Add Item
              </Button>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_80px_110px_110px_40px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>Total</span>
                <span></span>
              </div>
              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_110px_110px_40px] gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50/50 transition-colors">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="h-9"
                  />
                  <div className="flex items-center h-9 px-3 text-sm font-medium text-gray-900">
                    {formatCurrency(calcItemTotal(item.quantity, item.unitPrice))}
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    disabled={form.items.length <= 1}
                    className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <div className="w-full sm:w-80 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(calcSubtotal())}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 gap-3">
                  <span>Tax (%)</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.taxRate}
                    onChange={(e) => setForm(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-20 text-right text-xs"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 gap-3">
                  <span>Discount (%)</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.discount}
                    onChange={(e) => setForm(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                    className="h-8 w-20 text-right text-xs"
                  />
                </div>
                <div className="border-t border-gray-200 pt-2.5 flex justify-between font-semibold text-gray-900">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(calcTotal())}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all hover:border-gray-300 resize-none"
                placeholder="Additional notes for the client..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Terms</label>
              <textarea
                value={form.terms}
                onChange={(e) => setForm(prev => ({ ...prev, terms: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-200 focus:outline-none transition-all hover:border-gray-300 resize-none"
                placeholder="Payment terms and conditions..."
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!previewInvoice}
        onClose={() => setPreviewInvoice(null)}
        title="Invoice Preview"
        size="lg"
        footer={
          previewInvoice ? (
            <div className="flex justify-end gap-3 w-full">
              <Button variant="secondary" leftIcon={<Printer className="w-4 h-4" />} onClick={() => handlePrintInvoice(previewInvoice)}>
                Print / Save PDF
              </Button>
              <Button leftIcon={<Download className="w-4 h-4" />} onClick={() => handleDownloadInvoice(previewInvoice)}>
                Download PDF
              </Button>
            </div>
          ) : null
        }
      >
        {previewInvoice && (
          <div className="bg-white">
            <div className="flex items-start justify-between gap-8 border-b-[3px] border-gray-900 pb-5">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                {companyDetails.logo && (
                  <img
                    src={companyDetails.logo}
                    alt={companyDetails.name || 'Company logo'}
                    className="h-auto w-auto max-h-16 max-w-[190px] object-contain object-left-top shrink-0"
                  />
                )}
                <div className="min-w-0">
                  {companyDetails.name && <p className="text-base font-bold text-gray-900 leading-tight">{companyDetails.name}</p>}
                  <div className="text-xs text-gray-500 mt-1 leading-relaxed whitespace-pre-line">
                    {companyDetails.address && <p>{companyDetails.address}</p>}
                    {companyDetails.phone && <p>{companyDetails.phone}</p>}
                    {companyDetails.email && <p>{companyDetails.email}</p>}
                    {companyDetails.website && <p>{companyDetails.website}</p>}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <h3 className="text-2xl font-bold tracking-tight text-gray-900 leading-none">INVOICE</h3>
                <p className="text-sm text-gray-500 mt-1">{previewInvoice.invoiceNumber}</p>
                <div className="mt-2">
                  <Badge variant={STATUS_BADGE[previewInvoice.status]?.variant || 'gray'} size="sm" className="capitalize">
                    {previewInvoice.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1.5"><span className="font-semibold text-gray-900">Issued</span> {formatDate(previewInvoice.issuedAt || previewInvoice.createdAt)}</p>
                <p className="text-xs text-gray-500"><span className="font-semibold text-gray-900">Due</span> {formatDate(previewInvoice.dueAt)}</p>
              </div>
            </div>

            <div className="flex justify-between gap-8 py-5 text-sm">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Billed To</p>
                <p className="font-semibold text-gray-900">{(previewInvoice.clientId as any)?.companyName || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1">From</p>
                <p className="font-semibold text-gray-900">{companyDetails.name || previewInvoice.createdBy?.name}</p>
                {companyDetails.name && previewInvoice.createdBy?.name && (
                  <p className="text-gray-500">{[previewInvoice.createdBy.name, previewInvoice.createdBy.email].filter(Boolean).join(' · ')}</p>
                )}
                {!companyDetails.name && previewInvoice.createdBy?.email && (
                  <p className="text-gray-500">{previewInvoice.createdBy.email}</p>
                )}
              </div>
            </div>

            {previewInvoice.title && <p className="text-sm font-semibold text-gray-900 mb-3">{previewInvoice.title}</p>}

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_60px_110px_110px] gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Unit Price</span>
                <span className="text-right">Total</span>
              </div>
              {previewInvoice.items?.map((item, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_110px_110px] gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm">
                  <span className="text-gray-800">{item.description}</span>
                  <span className="text-right text-gray-600">{item.quantity}</span>
                  <span className="text-right text-gray-600">{formatCurrency(item.unitPrice)}</span>
                  <span className="text-right font-medium text-gray-900">{formatCurrency(item.total ?? item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 ml-auto w-full sm:w-72 space-y-1.5 text-sm">
              <div className="flex justify-between px-2.5 text-gray-600"><span>Subtotal</span><span>{formatCurrency(previewInvoice.subtotal)}</span></div>
              {previewInvoice.taxRate > 0 && (
                <div className="flex justify-between px-2.5 text-gray-600"><span>Tax ({previewInvoice.taxRate}%)</span><span>{formatCurrency(previewInvoice.taxAmount)}</span></div>
              )}
              {previewInvoice.discountAmount > 0 && (
                <div className="flex justify-between px-2.5 text-gray-600"><span>Discount</span><span>-{formatCurrency(previewInvoice.discountAmount)}</span></div>
              )}
              <div className="flex justify-between border-t-2 border-gray-900 pt-2 px-2.5 font-bold text-gray-900"><span>Total</span><span className="text-lg">{formatCurrency(previewInvoice.total)}</span></div>
              {(previewInvoice.amountPaid || 0) > 0 && (
                <div className="flex justify-between px-2.5 text-gray-600"><span>Paid</span><span>{formatCurrency(previewInvoice.amountPaid)}</span></div>
              )}
              {previewInvoice.amountDue > 0 && previewInvoice.status !== 'draft' && (
                <div className="flex justify-between px-2.5 text-gray-600"><span>Amount Due</span><span>{formatCurrency(previewInvoice.amountDue)}</span></div>
              )}
            </div>

            <div className="mt-6 space-y-3 text-xs text-gray-500 leading-relaxed">
              <div>
                <span className="block font-semibold text-gray-900">Notes</span>
                {getInvoiceNotes(previewInvoice)}
              </div>
              <div>
                <span className="block font-semibold text-gray-900">Terms</span>
                {getInvoiceTerms(previewInvoice)}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Invoice"
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to delete <span className="font-semibold text-gray-900">{deleteConfirm?.invoiceNumber}</span>?
          This will permanently remove the invoice and cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
