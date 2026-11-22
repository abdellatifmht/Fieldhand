export function formatDate(
  value: string,
  type: string,
  placeholder: string,
  language: string,
): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    return;
  if (type === 'date') return value;
  const [year, month, day] = value.split('-') as [string, string, string];
  const hint = placeholder.toLowerCase();
  const separator = hint.includes('.') ? '.' : hint.includes('-') ? '-' : '/';
  if (/^(yyyy|aaaa)/.test(hint)) return [year, month, day].join(separator);
  if (
    /^(mm)/.test(hint) ||
    (!/^(dd|jj)/.test(hint) && /^en(?:-us)?$/i.test(language))
  )
    return [month, day, year].join(separator);
  return [day, month, year].join(separator);
}
