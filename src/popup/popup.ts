import { loadStore, saveStore } from '../storage/store';
import { selectProfile, type Store } from '../storage/schema';
import { byId, element, localize, report, t } from '../shared/ui';
import type { FillResult } from '../content/fill';
localize();
const select = byId<HTMLSelectElement>('profile'),
  status = byId('status'),
  fill = byId<HTMLButtonElement>('fill'),
  undo = byId<HTMLButtonElement>('undo');
let store: Store;
function updateEmpty(): void {
  const profile = store.profiles.find((p) => p.id === select.value);
  byId('empty').hidden =
    !!profile &&
    (Object.values(profile.fields).some(Boolean) ||
      profile.customRules.some((r) => !!r.value));
}
function show(result: FillResult | { error: string }, action: string): void {
  if ('error' in result) {
    status.textContent = t(result.error);
    return;
  }
  undo.disabled = !result.undoAvailable;
  if (action !== 'status' || result.count)
    status.textContent = t(
      action === 'undo' || result.operation === 'undo'
        ? 'restoredCount'
        : 'filledCount',
      String(result.count),
    );
  byId('frames').hidden = !result.skippedFrames;
}
async function run(action: 'fill' | 'undo' | 'status'): Promise<void> {
  fill.disabled = true;
  undo.disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({
      action,
      profileId: select.value,
      insecureConfirmed: byId<HTMLInputElement>('confirmHttp').checked,
    });
    show(result, action);
  } catch (error) {
    report(error, status);
  } finally {
    fill.disabled = false;
  }
}
select.addEventListener('change', () => {
  void (async () => {
    try {
      const latest = await loadStore();
      latest.activeProfileId = select.value;
      await saveStore(latest);
      store = latest;
      updateEmpty();
    } catch (error) {
      report(error, status);
    }
  })();
});
fill.addEventListener('click', () => void run('fill'));
undo.addEventListener('click', () => void run('undo'));
byId('options').addEventListener(
  'click',
  () => void chrome.runtime.openOptionsPage(),
);
void (async () => {
  try {
    store = await loadStore();
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const hostname = tab?.url ? new URL(tab.url).hostname : '';
    for (const profile of store.profiles) {
      const option = element('option', profile.name);
      option.value = profile.id;
      select.append(option);
    }
    select.value = selectProfile(store, hostname).id;
    updateEmpty();
    byId('insecure').hidden = !tab?.url?.startsWith('http:');
    document.body.classList.toggle(
      'insecure-page',
      !!tab?.url?.startsWith('http:'),
    );
    await run('status');
  } catch (error) {
    report(error, status);
    fill.disabled = true;
  }
})();
