/**
 * Conservación de archivos cada 5 años (spec #10): funciones puras,
 * sin dependencias de base de datos, fáciles de testear.
 */
export const RENEWAL_PERIOD_YEARS = 5;
export const REMINDER_WINDOW_DAYS = 30;
export const GRACE_PERIOD_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Próxima fecha de renovación a partir de "ahora" (o de la renovación anterior). */
export function computeRenewalDueDate(from: Date): Date {
  const next = new Date(from);
  next.setFullYear(next.getFullYear() + RENEWAL_PERIOD_YEARS);
  return next;
}

/** ¿Quedan 30 días o menos para la fecha de renovación (y todavía no ha vencido)? */
export function isWithinReminderWindow(dueAt: Date, now: Date): boolean {
  const msLeft = dueAt.getTime() - now.getTime();
  return msLeft > 0 && msLeft <= REMINDER_WINDOW_DAYS * DAY_MS;
}

/** ¿Ha pasado ya la fecha de renovación? (gatea el acceso al álbum). */
export function isPastDue(dueAt: Date, now: Date): boolean {
  return now.getTime() > dueAt.getTime();
}

/** ¿Han pasado ya los 30 días de margen tras vencer, sin pagar? (se borra). */
export function isPastGracePeriod(dueAt: Date, now: Date): boolean {
  return now.getTime() > dueAt.getTime() + GRACE_PERIOD_DAYS * DAY_MS;
}

export function daysLeft(dueAt: Date, now: Date): number {
  return Math.ceil((dueAt.getTime() - now.getTime()) / DAY_MS);
}
