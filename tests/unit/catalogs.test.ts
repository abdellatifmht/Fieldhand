import { expect, it } from 'vitest';
import en from '../../src/_locales/en/messages.json';
import fr from '../../src/_locales/fr/messages.json';
import { fieldKeys } from '../../src/storage/schema';
it('provides matching, nonempty FR/EN messages and profile field labels', () => {
  expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
  for (const key of fieldKeys) expect(en).toHaveProperty(key);
  for (const [key, item] of Object.entries(en)) {
    expect(item.message.length).toBeGreaterThan(0);
    const translation = fr[key as keyof typeof fr].message;
    expect(translation.length).toBeGreaterThan(0);
    expect(translation.match(/\$\d/g) ?? []).toEqual(
      item.message.match(/\$\d/g) ?? [],
    );
  }
});
