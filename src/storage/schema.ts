export const fieldKeys = [
  'honorific',
  'firstName',
  'lastName',
  'birthDate',
  'email',
  'phone',
  'address1',
  'address2',
  'postalCode',
  'city',
  'region',
  'country',
  'company',
  'jobTitle',
  'website',
  'linkedin',
] as const;
export type FieldKey = (typeof fieldKeys)[number];
export type Fields = Record<FieldKey, string>;
export interface CustomRule {
  id: string;
  keywords: string;
  value: string;
  mode: 'contains' | 'exact';
}
export interface Profile {
  id: string;
  name: string;
  fields: Fields;
  customRules: CustomRule[];
  domains: string[];
}
export interface Settings {
  overwrite: boolean;
  highlight: boolean;
  diagnostic: boolean;
}
export interface Store {
  version: 1;
  profiles: Profile[];
  defaultProfileId: string;
  activeProfileId: string;
  settings: Settings;
}
export const defaultSettings: Settings = {
  overwrite: false,
  highlight: true,
  diagnostic: false,
};
export function emptyFields(): Fields {
  return Object.fromEntries(fieldKeys.map((key) => [key, ''])) as Fields;
}
export function newProfile(name: string): Profile {
  return {
    id: crypto.randomUUID(),
    name,
    fields: emptyFields(),
    customRules: [],
    domains: [],
  };
}
export function initialStore(name = 'Personal'): Store {
  const profile = newProfile(name);
  return {
    version: 1,
    profiles: [profile],
    defaultProfileId: profile.id,
    activeProfileId: profile.id,
    settings: { ...defaultSettings },
  };
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalidSchema');
  return value as Record<string, unknown>;
}
function string(value: unknown, max = 4000): string {
  if (typeof value !== 'string' || value.length > max)
    throw new Error('invalidSchema');
  return value;
}
export function validateStore(value: unknown): Store {
  const data = object(value);
  if (
    data.version !== 1 ||
    !Array.isArray(data.profiles) ||
    !data.profiles.length ||
    data.profiles.length > 100
  )
    throw new Error('invalidSchema');
  const profiles = data.profiles.map((entry): Profile => {
    const p = object(entry),
      source = object(p.fields),
      fields = emptyFields();
    for (const key of fieldKeys) fields[key] = string(source[key]);
    if (
      fields.birthDate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(fields.birthDate) ||
        Number.isNaN(new Date(fields.birthDate).getTime()) ||
        new Date(fields.birthDate).toISOString().slice(0, 10) !==
          fields.birthDate)
    )
      throw new Error('invalidSchema');
    if (
      !Array.isArray(p.customRules) ||
      p.customRules.length > 100 ||
      !Array.isArray(p.domains) ||
      p.domains.length > 100
    )
      throw new Error('invalidSchema');
    const customRules = p.customRules.map((entry): CustomRule => {
      const r = object(entry);
      if (r.mode !== 'contains' && r.mode !== 'exact')
        throw new Error('invalidSchema');
      return {
        id: string(r.id, 100),
        keywords: string(r.keywords, 1000),
        value: string(r.value),
        mode: r.mode,
      };
    });
    const domains = p.domains.map((entry) => {
      const domain = string(entry, 253).toLowerCase().trim();
      if (
        !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(
          domain,
        )
      )
        throw new Error('invalidSchema');
      return domain;
    });
    const name = string(p.name, 100).trim(),
      id = string(p.id, 100);
    if (
      !name ||
      !id ||
      new Set(customRules.map((r) => r.id)).size !== customRules.length
    )
      throw new Error('invalidSchema');
    return { id, name, fields, customRules, domains };
  });
  const ids = new Set(profiles.map((p) => p.id));
  if (
    ids.size !== profiles.length ||
    !ids.has(string(data.defaultProfileId)) ||
    !ids.has(string(data.activeProfileId))
  )
    throw new Error('invalidSchema');
  const source = object(data.settings);
  const settings = { ...defaultSettings };
  for (const key of ['overwrite', 'highlight', 'diagnostic'] as const) {
    if (typeof source[key] !== 'boolean') throw new Error('invalidSchema');
    settings[key] = source[key];
  }
  return {
    version: 1,
    profiles,
    defaultProfileId: string(data.defaultProfileId),
    activeProfileId: string(data.activeProfileId),
    settings,
  };
}
export function selectProfile(store: Store, hostname: string): Profile {
  return (
    store.profiles.find((p) =>
      p.domains.some((d) => hostname === d || hostname.endsWith('.' + d)),
    ) ??
    store.profiles.find((p) => p.id === store.activeProfileId) ??
    store.profiles.find((p) => p.id === store.defaultProfileId)!
  );
}
