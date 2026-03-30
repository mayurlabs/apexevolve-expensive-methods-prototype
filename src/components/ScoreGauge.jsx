export default function ScoreGauge({ label, value, size = 'md' }) {
  const percentage = Math.round(value * 100);
  const color =
    percentage >= 80
      ? 'text-sf-success'
      : percentage >= 60
        ? 'text-sf-warning'
        : 'text-sf-error';
  const bgColor =
    percentage >= 80
      ? 'bg-green-50 border-green-200'
      : percentage >= 60
        ? 'bg-amber-50 border-amber-200'
        : 'bg-red-50 border-red-200';
  const barColor =
    percentage >= 80
      ? 'bg-sf-success'
      : percentage >= 60
        ? 'bg-sf-warning'
        : 'bg-sf-error';

  if (size === 'lg') {
    return (
      <div className={`rounded-lg border p-3 ${bgColor}`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[12px] text-sf-text font-medium">{label}</span>
          <span className={`text-[16px] font-bold ${color}`}>{value.toFixed(3)}</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-sf-text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-700`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-[12px] font-semibold ${color} w-10 text-right`}>{value.toFixed(3)}</span>
      </div>
    </div>
  );
}
