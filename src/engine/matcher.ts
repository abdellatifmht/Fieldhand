import type { Profile, FieldKey } from '../storage/schema';
import { exclusionReason, type FieldDescriptor } from './fieldFilter';
import { includesWords, normalize } from './normalize';
import { autocompleteMap, synonyms } from './synonyms';
export interface Match {
  key: FieldKey | 'custom' | 'fullName';
  value: string;
  reason: string;
}
export function matchField(
  field: FieldDescriptor,
  profile: Profile,
): Match | undefined {
  if (exclusionReason(field)) return;
  const sources = [
    field.labels,
    field.ariaLabel,
    field.placeholder,
    field.name,
    field.id,
    field.title,
  ].map(normalize);
  for (const rule of profile.customRules) {
    if (
      rule.value &&
      rule.keywords
        .split(',')
        .map(normalize)
        .filter(Boolean)
        .some((k) =>
          sources.some((s) =>
            rule.mode === 'exact' ? s === k : s.includes(k),
          ),
        )
    ) {
      return { key: 'custom', value: rule.value, reason: 'custom' };
    }
  }
  const result = (
    key: FieldKey | 'fullName',
    reason: string,
  ): Match | undefined => {
    const value =
      key === 'fullName'
        ? [profile.fields.firstName, profile.fields.lastName]
            .filter(Boolean)
            .join(' ')
        : profile.fields[key];
    return value ? { key, value, reason } : undefined;
  };
  for (const token of field.autocomplete.toLowerCase().split(/\s+/)) {
    const key = autocompleteMap[token];
    if (key) return result(key, 'autocomplete');
  }
  if (field.type === 'email' || field.type === 'tel')
    return result(field.type === 'email' ? 'email' : 'phone', 'type');
  for (const source of sources) {
    if (
      includesWords(source, 'full name') ||
      includesWords(source, 'nom complet')
    )
      return result('fullName', 'keyword');
    // Une expression précise gagne contre un mot court (adresse 2 / adresse).
    const candidates = Object.entries(synonyms).flatMap(([key, terms]) =>
      terms
        .filter((term) => includesWords(source, term))
        .map((term) => ({ key: key as FieldKey, length: term.length })),
    );
    candidates.sort((a, b) => b.length - a.length);
    if (candidates[0]) return result(candidates[0].key, 'keyword');
  }
  return;
}
