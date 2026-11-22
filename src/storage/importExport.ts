import { validateStore, type Store } from './schema';
export const MAX_IMPORT_BYTES = 2_000_000;
export function parseImport(text: string): Store {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw new Error('fileTooLarge');
  return validateStore(JSON.parse(text));
}
export function exportStore(store: Store): string {
  return JSON.stringify(validateStore(store), null, 2);
}
export function mergeStores(current: Store, incoming: Store): Store {
  const profiles = incoming.profiles.map((p) => ({
    ...p,
    id: crypto.randomUUID(),
    customRules: p.customRules.map((r) => ({ ...r, id: crypto.randomUUID() })),
  }));
  return validateStore({
    ...current,
    profiles: [...current.profiles, ...profiles],
  });
}
