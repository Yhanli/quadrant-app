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

export type DateFieldProps = {
  value: string; // ISO yyyy-mm-dd, or "" when unset
  onChange: (isoDate: string) => void;
  placeholder?: string;
};
