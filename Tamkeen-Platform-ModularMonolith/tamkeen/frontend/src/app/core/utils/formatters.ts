
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', minimumFractionDigits: 0 }).format(amount);
}
export function formatDate(date: string): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));
}
export function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}
export function truncate(str: string, len: number): string {
  return str.length > len ? str.substring(0, len) + '...' : str;
}
export function formatRelativeDate(date: string): string {
  if (!date) return '—';
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
  return `منذ ${Math.floor(diffDays / 365)} سنوات`;
}
