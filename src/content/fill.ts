import { exclusionReason, type FieldDescriptor } from '../engine/fieldFilter';
import { matchField } from '../engine/matcher';
import { formatDate } from '../engine/dates';
import { chooseOption } from '../engine/selects';
import type { Profile, Settings } from '../storage/schema';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
interface Snapshot {
  element: Control;
  value: string;
  checked?: boolean;
}
export interface FillResult {
  count: number;
  undoAvailable: boolean;
  skippedFrames: number;
  duration: number;
  operation?: 'fill' | 'undo';
}
export interface ContentApi {
  fill(profile: Profile, settings: Settings): FillResult;
  undo(): FillResult;
  status(): FillResult;
}
declare global {
  interface Window {
    __fieldhand?: ContentApi;
  }
}

function collect(
  root: Document | ShadowRoot,
  controls: Control[],
  seen: Set<Document | ShadowRoot>,
): number {
  if (seen.has(root)) return 0;
  seen.add(root);
  let skipped = 0;
  for (const el of root.querySelectorAll('*')) {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
      controls.push(el as Control);
    if (el.shadowRoot) skipped += collect(el.shadowRoot, controls, seen);
    if (el.tagName === 'IFRAME') {
      try {
        const doc = (el as HTMLIFrameElement).contentDocument;
        if (doc) skipped += collect(doc, controls, seen);
        else skipped++;
      } catch {
        skipped++;
      }
    }
  }
  return skipped;
}
function visible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView!;
  let left = Math.max(0, rect.left),
    top = Math.max(0, rect.top);
  let right = Math.min(view.innerWidth, rect.right),
    bottom = Math.min(view.innerHeight, rect.bottom);
  let current: Element | null = element;
  while (current) {
    const view = current.ownerDocument.defaultView!;
    const style = view.getComputedStyle(current);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      Number(style.opacity) === 0 ||
      current.hasAttribute('inert') ||
      current.getAttribute('aria-hidden') === 'true' ||
      style.contentVisibility === 'hidden'
    )
      return false;
    if (current !== element) {
      const bounds = current.getBoundingClientRect();
      if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX)) {
        left = Math.max(left, bounds.left);
        right = Math.min(right, bounds.right);
      }
      if (['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY)) {
        top = Math.max(top, bounds.top);
        bottom = Math.min(bottom, bounds.bottom);
      }
    }
    if (right <= left || bottom <= top) return false;
    const parent: Element | null = current.parentElement;
    current = parent ?? (current.getRootNode() as ShadowRoot).host ?? null;
  }
  if (
    !rect.width ||
    !rect.height ||
    rect.right <= 0 ||
    rect.bottom <= 0 ||
    rect.left >= view.innerWidth ||
    rect.top >= view.innerHeight
  )
    return false;
  const frame = view.frameElement;
  return !frame || visible(frame);
}
function descriptor(el: Control): FieldDescriptor {
  const root = el.getRootNode() as Document | ShadowRoot;
  const labelled = (el.getAttribute('aria-labelledby') ?? '')
    .split(/\s+/)
    .map((id) => root.getElementById(id)?.textContent ?? '')
    .join(' ');
  const group =
    el.type === 'radio'
      ? el.closest('fieldset')?.querySelector('legend')?.textContent
      : '';
  return {
    tag: el.tagName.toLowerCase(),
    type: el.type,
    autocomplete: el.getAttribute('autocomplete') ?? '',
    labels: [
      group,
      [...(el.labels ?? [])].map((label) => label.textContent).join(' '),
      labelled,
    ]
      .filter(Boolean)
      .join(' '),
    ariaLabel: el.getAttribute('aria-label') ?? '',
    placeholder: el.getAttribute('placeholder') ?? '',
    name: el.name,
    id: el.id,
    title: el.title,
    visible: visible(el),
    disabled: el.matches(':disabled'),
    readOnly: 'readOnly' in el && el.readOnly,
    value: el.value,
    language: el.ownerDocument.documentElement.lang || 'en',
  };
}
function setNative(
  el: Control,
  property: 'value' | 'checked',
  value: string | boolean,
): void {
  // Le prototype du bon document évite les erreurs entre iframes.
  const view = el.ownerDocument.defaultView!;
  const prototype =
    el.tagName === 'SELECT'
      ? view.HTMLSelectElement.prototype
      : el.tagName === 'TEXTAREA'
        ? view.HTMLTextAreaElement.prototype
        : view.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, property)?.set?.call(el, value);
}
function emit(el: Control): void {
  const EventClass = el.ownerDocument.defaultView!.Event;
  for (const type of ['input', 'change', 'blur'])
    el.dispatchEvent(new EventClass(type, { bubbles: true, composed: true }));
}
function snapshot(el: Control): Snapshot {
  return {
    element: el,
    value: el.value,
    ...(el.type === 'radio'
      ? { checked: (el as HTMLInputElement).checked }
      : {}),
  };
}
function install(): ContentApi {
  let history: Snapshot[] = [];
  let last: FillResult = {
    count: 0,
    undoAvailable: false,
    skippedFrames: 0,
    duration: 0,
  };
  return {
    status: () => ({
      ...last,
      undoAvailable: history.some((s) => s.element.isConnected),
    }),
    fill(profile, settings) {
      const start = performance.now(),
        controls: Control[] = [];
      const skippedFrames = collect(document, controls, new Set());
      const next: Snapshot[] = [],
        handledRadios = new Set<Control>();
      let count = 0;
      for (const el of controls) {
        if (handledRadios.has(el)) continue;
        const field = descriptor(el);
        const match = matchField(field, profile);
        if (settings.diagnostic)
          console.debug('[Fieldhand]', {
            index: controls.indexOf(el),
            reason: exclusionReason(field) ?? match?.reason ?? 'no-match',
          });
        if (!match || !el.isConnected) continue;
        if (el.type === 'radio') {
          if (match.key !== 'honorific') continue;
          const group = controls.filter(
            (other) =>
              other.type === 'radio' &&
              other.getRootNode() === el.getRootNode() &&
              other.name === el.name &&
              (other as HTMLInputElement).form ===
                (el as HTMLInputElement).form &&
              (el.name !== '' || other === el),
          );
          group.forEach((r) => handledRadios.add(r));
          if (
            !settings.overwrite &&
            group.some((r) => (r as HTMLInputElement).checked)
          )
            continue;
          const candidates = group.filter(
            (r) => !exclusionReason(descriptor(r)),
          );
          const index = chooseOption(
            candidates.map((r) => ({
              value: r.value,
              text: [...(r.labels ?? [])].map((l) => l.textContent).join(' '),
            })),
            match.value,
            'honorific',
          );
          const chosen = candidates[index] as HTMLInputElement | undefined;
          if (!chosen || chosen.checked) continue;
          next.push(...group.map(snapshot));
          setNative(chosen, 'checked', true);
          emit(chosen);
          count++;
          continue;
        }
        if (!settings.overwrite && el.value !== '') continue;
        let value = match.value;
        if (match.key === 'birthDate') {
          const formatted = formatDate(
            value,
            el.type,
            field.placeholder,
            field.language,
          );
          if (!formatted) continue;
          value = formatted;
        }
        if (el.tagName === 'SELECT') {
          const select = el as HTMLSelectElement;
          if (select.multiple) continue;
          const index = chooseOption(
            [...select.options].map((o) => ({
              value: o.value,
              text: o.text,
              disabled:
                o.disabled ||
                (o.parentElement?.tagName === 'OPTGROUP' &&
                  (o.parentElement as HTMLOptGroupElement).disabled),
            })),
            value,
            match.key,
          );
          if (index < 0) continue;
          value = select.options[index]!.value;
        }
        if (el.type === 'number' && !/^-?(?:\d+\.?\d*|\.\d+)$/.test(value))
          continue;
        if (value === el.value) continue;
        const before = snapshot(el);
        setNative(el, 'value', value);
        if (el.value === before.value) continue;
        next.push(before);
        emit(el);
        count++;
        if (
          settings.highlight &&
          !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
          el.animate?.(
            [
              { outline: '3px solid #16715a', outlineOffset: '3px' },
              { outline: '3px solid transparent', outlineOffset: '3px' },
            ],
            { duration: 1400 },
          );
        }
      }
      // Un second clic sans changement conserve l'annulation précédente.
      if (next.length) history = next;
      last = {
        count,
        undoAvailable: history.length > 0,
        skippedFrames,
        duration: performance.now() - start,
        operation: 'fill',
      };
      return last;
    },
    undo() {
      let count = 0;
      const connected = history.filter((s) => s.element.isConnected);
      for (const s of connected) {
        if (s.checked !== undefined) setNative(s.element, 'checked', false);
        else setNative(s.element, 'value', s.value);
      }
      for (const s of connected)
        if (s.checked) setNative(s.element, 'checked', true);
      for (const s of connected) {
        emit(s.element);
        count++;
      }
      history = [];
      last = {
        count,
        undoAvailable: false,
        skippedFrames: last.skippedFrames,
        duration: 0,
        operation: 'undo',
      };
      return last;
    },
  };
}
window.__fieldhand ??= install();
