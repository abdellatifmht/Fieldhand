import { describe, expect, it } from 'vitest';
import { normalize, includesWords } from '../../src/engine/normalize';
import { matchField } from '../../src/engine/matcher';
import {
  synonyms,
  autocompleteMap,
  countryGroups,
} from '../../src/engine/synonyms';
import {
  exclusionReason,
  type FieldDescriptor,
} from '../../src/engine/fieldFilter';
import { chooseOption, aliases } from '../../src/engine/selects';
import { formatDate } from '../../src/engine/dates';
import { fieldKeys, newProfile } from '../../src/storage/schema';
const profile = newProfile('Test');
for (const key of fieldKeys) profile.fields[key] = key;
export function field(
  overrides: Partial<FieldDescriptor> = {},
): FieldDescriptor {
  return {
    tag: 'input',
    type: 'text',
    autocomplete: '',
    labels: '',
    ariaLabel: '',
    placeholder: '',
    name: '',
    id: '',
    title: '',
    visible: true,
    disabled: false,
    readOnly: false,
    value: '',
    language: 'fr',
    ...overrides,
  };
}
describe('normalization', () => {
  it.each([
    ['Prénom', 'prenom'],
    ['firstName', 'first name'],
    ['address_line-2[home]', 'address line 2 home'],
    ['  E.mail  ', 'e mail'],
    ['ÉTAT', 'etat'],
    ['nomDeFamille', 'nom de famille'],
  ])('%s → %s', (input, output) => expect(normalize(input)).toBe(output));
  it('uses whole words', () => {
    expect(includesWords('postal code', 'postal')).toBe(true);
    expect(includesWords('surname', 'name')).toBe(false);
    expect(includesWords('anything', '')).toBe(false);
  });
});
describe('FR/EN detection matrix', () => {
  // Les variantes traversent toutes les sources et la normalisation des séparateurs.
  const cases = Object.entries(synonyms).flatMap(([key, terms]) =>
    terms.flatMap((term) =>
      ['labels', 'ariaLabel', 'placeholder', 'name', 'id', 'title'].map(
        (source) => ({ key, term, source }),
      ),
    ),
  );
  it.each(cases)('$source: $term → $key', ({ key, term, source }) => {
    expect(matchField(field({ [source]: term }), profile)?.key).toBe(key);
  });
  it.each(Object.entries(autocompleteMap))('autocomplete %s', (token, key) =>
    expect(
      matchField(
        field({ autocomplete: 'section-home shipping ' + token }),
        profile,
      )?.key,
    ).toBe(key),
  );
  it.each(['email', 'tel'])('type %s precedes labels', (type) =>
    expect(matchField(field({ type, labels: 'City' }), profile)?.key).toBe(
      type === 'email' ? 'email' : 'phone',
    ),
  );
  it('respects source order', () =>
    expect(
      matchField(field({ labels: 'Ville', name: 'email' }), profile)?.key,
    ).toBe('city'));
  it('matches full names', () => {
    expect(matchField(field({ labels: 'Nom complet' }), profile)?.value).toBe(
      'firstName lastName',
    );
    expect(matchField(field({ labels: 'Full name' }), profile)?.key).toBe(
      'fullName',
    );
  });
  it('custom priority and modes', () => {
    const p = structuredClone(profile);
    p.customRules = [
      { id: '1', keywords: 'e-mail, email', mode: 'contains', value: 'custom' },
    ];
    expect(
      matchField(field({ type: 'email', labels: 'Email address' }), p)?.value,
    ).toBe('custom');
    p.customRules[0]!.mode = 'exact';
    expect(matchField(field({ labels: 'Email address' }), p)?.reason).toBe(
      'keyword',
    );
    expect(matchField(field({ labels: 'EMAIL' }), p)?.reason).toBe('custom');
    p.customRules[0]!.value = '';
    expect(matchField(field({ labels: 'EMAIL' }), p)?.reason).toBe('keyword');
  });
  it('returns no match for unknown or empty fields', () => {
    expect(matchField(field(), profile)).toBeUndefined();
    expect(
      matchField(field({ labels: 'Email' }), newProfile('Empty')),
    ).toBeUndefined();
    expect(
      matchField(field({ autocomplete: 'name' }), newProfile('Empty')),
    ).toBeUndefined();
  });
});
describe('safety exclusions', () => {
  it.each([
    'password',
    'checkbox',
    'hidden',
    'submit',
    'button',
    'file',
    'search',
    'color',
  ])('excludes type %s', (type) =>
    expect(
      matchField(field({ type, labels: 'Email' }), profile),
    ).toBeUndefined(),
  );
  it.each([
    'cc-number',
    'cc-name',
    'section-payment cc-csc',
    'one-time-code',
    'username',
    'new-password',
    'current-password',
  ])('excludes autocomplete %s', (autocomplete) =>
    expect(exclusionReason(field({ autocomplete }))).toBe(
      'sensitive-autocomplete',
    ),
  );
  it.each([
    'Card number',
    'Credit card email',
    'IBAN',
    'CVV',
    'CVC',
    'BIC',
    'SWIFT',
    'Mot de passe',
    'Username',
    'User ID',
    'Identifiant',
    'Nom d’utilisateur',
    'login',
    'security code',
    'code de sécurité',
    'SSN',
    'creditcard',
    'userid',
    'nomutilisateur',
  ])('excludes %s before custom rules', (labels) => {
    const p = structuredClone(profile);
    p.customRules = [
      { id: '1', keywords: labels, value: 'secret', mode: 'contains' },
    ];
    expect(matchField(field({ labels }), p)).toBeUndefined();
  });
  it.each([{ visible: false }, { disabled: true }, { readOnly: true }])(
    'excludes unavailable %o',
    (overrides) =>
      expect(
        matchField(field({ labels: 'Email', ...overrides }), profile),
      ).toBeUndefined(),
  );
  it('allows textarea and select', () => {
    expect(
      exclusionReason(field({ tag: 'select', type: 'select-one' })),
    ).toBeUndefined();
    expect(
      exclusionReason(field({ tag: 'textarea', type: 'textarea' })),
    ).toBeUndefined();
  });
});
describe('dates', () => {
  it.each([
    ['date', '', 'fr', '1990-12-31'],
    ['text', 'JJ/MM/AAAA', 'en', '31/12/1990'],
    ['text', 'MM-DD-YYYY', 'fr', '12-31-1990'],
    ['text', 'YYYY.MM.DD', 'fr', '1990.12.31'],
    ['text', '', 'en-US', '12/31/1990'],
    ['text', '', 'en-GB', '31/12/1990'],
    ['text', '', 'fr', '31/12/1990'],
  ])('%s %s %s', (type, hint, lang, expected) =>
    expect(formatDate('1990-12-31', type, hint, lang)).toBe(expected),
  );
  it.each(['31/12/1990', 'invalid', '2025-02-31', '2025-13-01', '2025-00-01'])(
    'rejects invalid %s',
    (value) => expect(formatDate(value, 'date', '', 'fr')).toBeUndefined(),
  );
});
describe('selects', () => {
  it.each(
    countryGroups.flatMap((group) => group.map((value) => [value, group[0]!])),
  )('country %s → %s', (value, expected) => {
    expect(
      chooseOption(
        [
          { value: '', text: 'Choose' },
          { value: expected, text: expected },
        ],
        value,
        'country',
      ),
    ).toBe(1);
  });
  it('matches text, aliases and honorifics', () => {
    expect(
      chooseOption([{ value: 'custom', text: 'France' }], 'FRA', 'country'),
    ).toBe(0);
    expect(
      chooseOption([{ value: '1', text: 'Monsieur' }], 'Mr', 'honorific'),
    ).toBe(0);
    expect(
      chooseOption([{ value: '2', text: 'Madame' }], 'Mrs', 'honorific'),
    ).toBe(0);
    expect(
      chooseOption([{ value: 'ca', text: 'California (CA)' }], 'California'),
    ).toBe(0);
    expect(aliases('unknown', 'country')).toEqual(['unknown']);
  });
  it('rejects ambiguous, disabled and empty matches', () => {
    expect(
      chooseOption(
        [
          { value: 'a', text: 'France' },
          { value: 'b', text: 'France' },
        ],
        'FR',
        'country',
      ),
    ).toBe(-1);
    expect(
      chooseOption(
        [{ value: 'FR', text: 'France', disabled: true }],
        'FR',
        'country',
      ),
    ).toBe(-1);
    expect(
      chooseOption([{ value: '', text: 'France' }], 'France', 'country'),
    ).toBe(-1);
    expect(chooseOption([], 'FR')).toBe(-1);
    expect(chooseOption([{ value: 'US', text: 'USA' }], 'FR', 'country')).toBe(
      -1,
    );
  });
});
