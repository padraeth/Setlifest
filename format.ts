import { localDateKey } from './calculations';

export function newId(): string { return crypto.randomUUID(); }
export function todayKey(): string { return localDateKey(); }
export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  if (!value) return 'No date';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? 'No date' : new Intl.DateTimeFormat(undefined, options).format(date);
}
export function isPast(value: string): boolean { return Boolean(value) && value < todayKey(); }
export function titleCase(value: string): string { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
export function greetingName(fullName: string): string { return fullName.trim().split(/\s+/)[0] || 'there'; }

export async function recurringTaskId(taskId: string, dueDate: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`setlifest:task-occurrence:${taskId}:${dueDate}`)));
  digest[6] = (digest[6] & 0x0f) | 0x80;
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
