import { includesWords, normalize } from './normalize';
import { countryGroups } from './synonyms';
export interface OptionDescriptor {
  value: string;
  text: string;
  disabled?: boolean;
}
export function aliases(value: string, kind: string): string[] {
  const normalized = normalize(value);
  const groups =
    kind === 'country'
      ? countryGroups
      : kind === 'honorific'
        ? [
            ['Mr', 'Monsieur', 'M', 'Mister'],
            ['Mrs', 'Ms', 'Madame', 'Mme'],
            ['Miss', 'Mademoiselle', 'Mlle'],
            ['Dr', 'Docteur', 'Doctor'],
          ]
        : [];
  return (
    groups
      .find((g) => g.some((item) => normalize(item) === normalized))
      ?.map(normalize) ?? [normalized]
  );
}
export function chooseOption(
  options: OptionDescriptor[],
  value: string,
  kind = '',
): number {
  const variants = aliases(value, kind);
  const scores = options.map((o) => {
    if (o.disabled || !o.value) return 0;
    const texts = [normalize(o.value), normalize(o.text)];
    if (texts.some((t) => variants.includes(t))) return 2;
    return texts.some((t) =>
      variants.some((v) => v.length > 2 && includesWords(t, v)),
    )
      ? 1
      : 0;
  });
  const best = Math.max(0, ...scores);
  const winners = scores.flatMap((s, i) => (s === best ? [i] : []));
  return best && winners.length === 1 ? winners[0]! : -1;
}
