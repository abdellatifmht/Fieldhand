import { describe, expect, it } from 'vitest';
import {
  initialStore,
  validateStore,
  selectProfile,
  newProfile,
} from '../../src/storage/schema';
import { migrate } from '../../src/storage/migrations';
import {
  exportStore,
  mergeStores,
  parseImport,
} from '../../src/storage/importExport';
describe('storage and transfers', () => {
  it('roundtrips every field, custom rules and settings', () => {
    const store = initialStore('Perso');
    const p = store.profiles[0]!;
    p.fields.email = 'person@example.test';
    p.fields.birthDate = '1990-12-31';
    p.customRules.push({
      id: 'rule',
      keywords: 'reference, numéro',
      value: '<script>',
      mode: 'exact',
    });
    p.domains = ['example.test'];
    expect(parseImport(exportStore(store))).toEqual(store);
  });
  it('merges without overwriting IDs or preferences', () => {
    const store = initialStore();
    const next = mergeStores(store, store);
    expect(next.profiles).toHaveLength(2);
    expect(next.profiles[1]!.id).not.toBe(store.profiles[0]!.id);
    expect(next.settings).toEqual(store.settings);
    expect(next.defaultProfileId).toBe(store.defaultProfileId);
  });
  it('migrates undefined and documented v0', () => {
    expect(migrate(undefined).version).toBe(1);
    expect(
      migrate({ version: 0, profile: { firstName: 'Ada' } }).profiles[0]!.fields
        .firstName,
    ).toBe('Ada');
  });
  it('matches domain boundaries, then active profile', () => {
    const store = initialStore(),
      p = newProfile('Work');
    p.domains = ['example.test'];
    store.profiles.push(p);
    expect(selectProfile(store, 'jobs.example.test').id).toBe(p.id);
    expect(selectProfile(store, 'evilexample.test').id).toBe(
      store.activeProfileId,
    );
    store.activeProfileId = p.id;
    expect(selectProfile(store, 'elsewhere.test').id).toBe(p.id);
  });
  it.each([null, [], {}, { version: 2 }, { ...initialStore(), profiles: [] }])(
    'rejects malformed data %o',
    (value) => expect(() => validateStore(value)).toThrow(),
  );
  it.each([
    'name',
    'birthDate',
    'domain',
    'duplicateId',
    'ruleMode',
    'settings',
    'defaultId',
    'missingField',
    'tooManyProfiles',
  ])('rejects invalid %s', (kind) => {
    const s = initialStore(),
      p = s.profiles[0]!;
    if (kind === 'name') p.name = '';
    if (kind === 'birthDate') p.fields.birthDate = '2025-02-31';
    if (kind === 'domain') p.domains = ['https://example.test/path'];
    if (kind === 'duplicateId') s.profiles.push(structuredClone(p));
    if (kind === 'ruleMode')
      p.customRules.push({
        id: '1',
        keywords: 'k',
        value: 'v',
        mode: 'regex' as 'exact',
      });
    if (kind === 'settings')
      (s.settings as unknown as Record<string, unknown>).overwrite = 'yes';
    if (kind === 'defaultId') s.defaultProfileId = 'missing';
    if (kind === 'missingField')
      delete (p.fields as Partial<typeof p.fields>).city;
    if (kind === 'tooManyProfiles')
      s.profiles = Array.from({ length: 101 }, () => newProfile('test'));
    expect(() => validateStore(s)).toThrow();
  });
  it('rejects malformed, oversized and future-version import without changing original data', () => {
    expect(() => parseImport('{')).toThrow();
    expect(() => parseImport(' '.repeat(2_000_001))).toThrow('fileTooLarge');
    expect(() => migrate({ version: 20 })).toThrow();
  });
  it('drops unknown properties and prototype keys', () => {
    const s = initialStore();
    const candidate = JSON.parse(JSON.stringify(s));
    candidate.extra = 'not stored';
    candidate.profiles[0].fields.__proto__ = { secret: 1 };
    expect(validateStore(candidate)).toEqual(s);
  });
});
