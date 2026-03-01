
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
