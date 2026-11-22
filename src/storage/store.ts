import { migrate } from './migrations';
import { validateStore, type Store } from './schema';
export async function loadStore(): Promise<Store> {
  const { fieldhand } = await chrome.storage.local.get('fieldhand');
  const store = migrate(fieldhand);
  if (fieldhand === undefined)
    store.profiles[0]!.name =
      chrome.i18n.getMessage('personalProfile') || 'Personal';
  if (
    fieldhand === undefined ||
    (fieldhand &&
      typeof fieldhand === 'object' &&
      'version' in fieldhand &&
      fieldhand.version !== 1)
  )
    await saveStore(store);
  return store;
}
export async function saveStore(store: Store): Promise<void> {
  await chrome.storage.local.set({ fieldhand: validateStore(store) });
}
