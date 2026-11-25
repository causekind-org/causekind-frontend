/**
 * Pages where someone came to finish a task (a handover, a certificate, a form).
 * Welcome overlays and promo toasts stay off these pages so they never cover the task.
 * The optional leading segment allows a locale prefix ("/hi/certificate").
 */
const TASK_PATHS: RegExp[] = [
  /^(\/[a-z]{2})?\/certificate\/?$/,
  /^(\/[a-z]{2})?\/ngo-drive-offers\/\d+\/handover\/?$/,
  /^(\/[a-z]{2})?\/ngo\/drives\/\d+\/offers\/\d+\/handover\/?$/,
  /^(\/[a-z]{2})?\/offers\/\d+\/handover\/?$/,
  /^(\/[a-z]{2})?\/matches\/\d+\/handover\/?$/,
  /^(\/[a-z]{2})?\/drives\/\d+\/(give|proof)\/?$/,
  /^(\/[a-z]{2})?\/volunteer-handover(\/.*)?$/,
  /^(\/[a-z]{2})?\/ngo\/drives\/new\/?$/,
  /^(\/[a-z]{2})?\/profile\/ngo-details\/?$/,
];

export function isTaskPath(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return TASK_PATHS.some((re) => re.test(p));
}
