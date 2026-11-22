export function t(key: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(key, substitutions) || key;
}
export function localize(): void {
  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n!);
  });
  document
    .querySelectorAll<HTMLElement>('[data-i18n-label]')
    .forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nLabel!)));
  document.title = t(document.body.dataset.title ?? 'appName');
}
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
export function byId<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
export function report(error: unknown, status: HTMLElement): void {
  const key =
    error instanceof Error &&
    ['invalidSchema', 'fileTooLarge', 'lastProfile'].includes(error.message)
      ? error.message
      : 'operationFailed';
  status.textContent = t(key);
}
