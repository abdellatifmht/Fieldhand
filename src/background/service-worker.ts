import { loadStore } from '../storage/store';
import { selectProfile, type Profile, type Settings } from '../storage/schema';
import type { FillResult } from '../content/fill';

interface Request {
  action: 'fill' | 'undo' | 'status';
  profileId?: string;
  insecureConfirmed?: boolean;
}
export async function execute(
  request: Request,
): Promise<FillResult | { error: string }> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id || !tab.url || !/^https?:/.test(tab.url))
      return { error: 'unsupportedPage' };
    if (request.action === 'status') {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.__fieldhand?.status(),
      });
      return (
        results[0]?.result ?? {
          count: 0,
          undoAvailable: false,
          skippedFrames: 0,
          duration: 0,
        }
      );
    }
    if (
      request.action === 'fill' &&
      !tab.url.startsWith('https:') &&
      !request.insecureConfirmed
    )
      return { error: 'insecurePage' };
    const store = await loadStore();
    const profile = request.profileId
      ? store.profiles.find((p) => p.id === request.profileId)
      : selectProfile(store, new URL(tab.url).hostname);
    if (!profile) return { error: 'invalidSchema' };
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js'],
    });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (action: string, profile: Profile, settings: Settings) =>
        action === 'undo'
          ? window.__fieldhand!.undo()
          : window.__fieldhand!.fill(profile, settings),
      args: [request.action, profile, store.settings],
    });
    const result = results[0]?.result;
    if (!result) return { error: 'operationFailed' };
    await chrome.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: '#166650',
    });
    await chrome.action.setBadgeText({
      tabId: tab.id,
      text: request.action === 'undo' ? '' : String(result.count),
    });
    return result;
  } catch {
    return { error: 'operationFailed' };
  }
}
chrome.runtime.onMessage.addListener((request: unknown, sender, respond) => {
  // Seules les pages de cette extension peuvent déclencher une action.
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    !sender.url?.startsWith(chrome.runtime.getURL(''))
  )
    return;
  if (
    !request ||
    typeof request !== 'object' ||
    !('action' in request) ||
    !['fill', 'undo', 'status'].includes(String(request.action))
  )
    return;
  void execute(request as Request).then(respond);
  return true;
});
chrome.commands.onCommand.addListener((command) => {
  if (command !== 'fill-form') return;
  void execute({ action: 'fill' }).then(async (result) => {
    if ('error' in result) {
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setTitle({
        title: chrome.i18n.getMessage(result.error),
      });
      try {
        await chrome.action.openPopup();
      } catch {
        /* Versions antérieures à Chrome 127 : ouvrir le popup manuellement. */
      }
    }
  });
});
chrome.runtime.onInstalled.addListener(() => {
  // Empêche les scripts de contenu d'accéder directement aux profils enregistrés.
  void chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
});
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading')
    void chrome.action.setBadgeText({ tabId, text: '' });
});
