import { beforeEach, expect, it, vi } from 'vitest';
import { initialStore } from '../../src/storage/schema';
import { loadStore, saveStore } from '../../src/storage/store';
let saved: unknown;
const write = vi.fn(async (value: { fieldhand: unknown }) => {
  saved = structuredClone(value.fieldhand);
});
beforeEach(() => {
  saved = undefined;
  write.mockClear();
  vi.stubGlobal('chrome', {
    storage: { local: { get: async () => ({ fieldhand: saved }), set: write } },
    i18n: { getMessage: () => 'Personnel' },
  });
});
it('persists first-run IDs so the popup and worker use the same profile', async () => {
  const first = await loadStore(),
    second = await loadStore();
  expect(first).toEqual(second);
  expect(first.profiles[0]!.name).toBe('Personnel');
  expect(write).toHaveBeenCalledTimes(1);
});
it('persists a migrated store once', async () => {
  saved = { version: 0, profile: { email: 'legacy@example.test' } };
  const first = await loadStore();
  expect(await loadStore()).toEqual(first);
  expect(write).toHaveBeenCalledTimes(1);
});
it('rejects corrupted and future data without erasing it', async () => {
  saved = { version: 99 };
  await expect(loadStore()).rejects.toThrow();
  expect(saved).toEqual({ version: 99 });
  expect(write).not.toHaveBeenCalled();
});
it('validates before writing', async () => {
  const store = initialStore();
  store.profiles = [];
  await expect(saveStore(store)).rejects.toThrow();
  expect(write).not.toHaveBeenCalled();
});
