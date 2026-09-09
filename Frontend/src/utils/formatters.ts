export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  if (amount === undefined || amount === null) return '$0';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  return date.toLocaleDateString('en-US', options || defaultOptions);
}

export function formatDateTime(dateString: string): string {
  return formatDate(dateString, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getStatusColor(status: string): 'primary' | 'success' | 'warning' | 'danger' | 'gray' {
  const statusColors: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'gray'> = {
    active: 'success',
    inactive: 'gray',
    prospect: 'primary',
    archived: 'gray',
    new: 'primary',
    contacted: 'primary',
    qualified: 'success',
    proposal: 'warning',
    negotiation: 'warning',
    won: 'success',
    lost: 'danger',
    todo: 'gray',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'danger',
    low: 'gray',
    medium: 'primary',
    high: 'warning',
    urgent: 'danger',
  };
  return statusColors[status?.toLowerCase()] || 'gray';
}

export function getPriorityColor(priority: string): 'primary' | 'success' | 'warning' | 'danger' | 'gray' {
  const priorityColors: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'gray'> = {
    low: 'gray',
    medium: 'primary',
    high: 'warning',
    urgent: 'danger',
  };
  return priorityColors[priority?.toLowerCase()] || 'gray';
}

export function getStageColor(stage: string): 'primary' | 'success' | 'warning' | 'danger' | 'gray' {
  const stageColors: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'gray'> = {
    new: 'primary',
    qualified: 'success',
    proposal: 'warning',
    negotiation: 'warning',
    won: 'success',
    lost: 'danger',
  };
  return stageColors[stage?.toLowerCase()] || 'primary';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}