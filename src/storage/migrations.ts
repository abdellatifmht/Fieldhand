import { emptyFields, initialStore, validateStore, type Store } from './schema';
export function migrate(value: unknown): Store {
  if (value === undefined) return initialStore();
  if (
    value &&
    typeof value === 'object' &&
    'version' in value &&
    value.version === 0 &&
    'profile' in value
  ) {
    const store = initialStore();
    store.profiles[0]!.fields = {
      ...emptyFields(),
      ...(value.profile as object),
    };
    return validateStore(store);
  }
  return validateStore(value);
}
