export function normalize(value: string): string {
  return value
    .replace(/([a-zà-ÿ])([A-Z])/g, '$1 $2')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
export function includesWords(text: string, phrase: string): boolean {
  return !!phrase && (' ' + text + ' ').includes(' ' + phrase + ' ');
}
