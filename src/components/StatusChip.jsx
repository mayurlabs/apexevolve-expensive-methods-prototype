import { CheckCircle2, Clock, Loader2, AlertCircle, XCircle, CalendarClock, Timer } from 'lucide-react';

const STATUS_CONFIG = {
  queued: { label: 'Queued', bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
  'in-progress': { label: 'In Progress', bg: 'bg-blue-50', text: 'text-sf-blue', icon: Loader2, spin: true },
  ready: { label: 'Ready for Review', bg: 'bg-green-50', text: 'text-sf-success', icon: CheckCircle2 },
  failed: { label: 'Failed', bg: 'bg-red-50', text: 'text-sf-error', icon: XCircle },
  'waiting-env': { label: 'Waiting for Environment', bg: 'bg-amber-50', text: 'text-amber-700', icon: Timer },
  scheduled: { label: 'Scheduled', bg: 'bg-purple-50', text: 'text-purple-700', icon: CalendarClock },
  available: { label: 'Available', bg: 'bg-green-50', text: 'text-sf-success', icon: CheckCircle2 },
  busy: { label: 'Busy', bg: 'bg-amber-50', text: 'text-amber-700', icon: AlertCircle },
  'not-configured': { label: 'Not Configured', bg: 'bg-gray-100', text: 'text-gray-600', icon: AlertCircle },
};

export default function StatusChip({ status, size = 'sm' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.queued;
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-[12px] px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <Icon className={`w-3 h-3 ${config.spin ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
}
