// Dates are stored internally as ISO `yyyy-mm-dd` (stable, sortable) and shown
// to the user as `dd/mm/yyyy`.

export function formatDueDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value; // tolerate legacy/free-form values
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Format a full ISO timestamp (e.g. completed_at) as dd/mm/yyyy.
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return toISODate(date).split("-").reverse().join("/");
}

// How long ago `iso` was, as a short human phrase: "today", "1 day", "3 days",
// "2 weeks", "1 month", "2 years".
export function relativeAge(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const days = Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  if (days < 14) return "1 week";
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 60) return "1 month";
  if (days < 365) return `${Math.floor(days / 30)} months`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year" : `${years} years`;
}

export type DateFieldProps = {
  value: string; // ISO yyyy-mm-dd, or "" when unset
  onChange: (isoDate: string) => void;
  placeholder?: string;
};
