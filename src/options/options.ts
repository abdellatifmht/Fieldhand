import {
  fieldKeys,
  initialStore,
  newProfile,
  validateStore,
  type Profile,
  type Store,
  type FieldKey,
} from '../storage/schema';
import { loadStore, saveStore } from '../storage/store';
import {
  exportStore,
  MAX_IMPORT_BYTES,
  mergeStores,
  parseImport,
} from '../storage/importExport';
import { byId, element, localize, report, t } from '../shared/ui';
localize();
let store: Store, selectedId: string, pendingImport: Store | undefined;
let dirty = false,
  busy = false;
const status = byId('saveStatus'),
  editor = byId<HTMLFormElement>('editor');
const dialog = byId<HTMLDialogElement>('importDialog');
function current(): Profile {
  return store.profiles.find((p) => p.id === selectedId)!;
}
function fieldInput(key: FieldKey): HTMLLabelElement {
  const label = element('label'),
    input = element('input');
  input.id = 'field-' + key;
  input.maxLength = 4000;
  input.type =
    key === 'birthDate'
      ? 'date'
      : key === 'email'
        ? 'email'
        : ['website', 'linkedin'].includes(key)
          ? 'url'
          : key === 'phone'
            ? 'tel'
            : 'text';
  input.autocomplete = 'off';
  label.append(element('span', t(key)), input);
  return label;
}
for (const key of fieldKeys)
  byId(
    [
      'address1',
      'address2',
      'postalCode',
      'city',
      'region',
      'country',
    ].includes(key)
      ? 'addressFields'
      : ['company', 'jobTitle', 'website', 'linkedin'].includes(key)
        ? 'workFields'
        : 'personalFields',
  ).append(fieldInput(key));
function ruleRow(rule: Profile['customRules'][number]): HTMLElement {
  const row = element('div', undefined, 'rule'),
    grid = element('div', undefined, 'field-grid');
  row.dataset.ruleId = rule.id;
  for (const key of ['keywords', 'value'] as const) {
    const label = element('label'),
      input = element('input');
    input.dataset.part = key;
    input.value = rule[key];
    input.maxLength = key === 'keywords' ? 1000 : 4000;
    label.append(element('span', t(key)), input);
    grid.append(label);
  }
  const modeLabel = element('label'),
    mode = element('select');
  mode.dataset.part = 'mode';
  for (const value of ['contains', 'exact']) {
    const option = element('option', t(value));
    option.value = value;
    mode.append(option);
  }
  mode.value = rule.mode;
  modeLabel.append(element('span', t('matchMode')), mode);
  grid.append(modeLabel);
  row.append(grid);
  const remove = element('button', t('removeRule'), 'danger');
  remove.type = 'button';
  remove.addEventListener('click', () => {
    row.remove();
    dirty = true;
    byId('addRule').focus();
  });
  row.append(remove);
  return row;
}
function render(): void {
  const nav = byId('profiles');
  nav.replaceChildren();
  for (const profile of store.profiles) {
    const button = element('button', profile.name);
    button.type = 'button';
    button.setAttribute('aria-current', String(profile.id === selectedId));
    if (profile.id === store.defaultProfileId)
      button.append(element('span', t('defaultProfile'), 'tag'));
    button.addEventListener('click', () => {
      if (!discard()) return;
      selectedId = profile.id;
      render();
      byId('profileName').focus();
    });
    nav.append(button);
  }
  const profile = current();
  byId('profileTitle').textContent = profile.name;
  byId<HTMLInputElement>('profileName').value = profile.name;
  byId<HTMLInputElement>('domains').value = profile.domains.join(', ');
  byId('defaultTag').hidden = profile.id !== store.defaultProfileId;
  byId<HTMLButtonElement>('makeDefault').disabled =
    profile.id === store.defaultProfileId;
  byId<HTMLButtonElement>('delete').disabled = store.profiles.length === 1;
  for (const key of fieldKeys)
    byId<HTMLInputElement>('field-' + key).value = profile.fields[key];
  byId('rules').replaceChildren(...profile.customRules.map(ruleRow));
  for (const key of ['overwrite', 'highlight', 'diagnostic'] as const)
    byId<HTMLInputElement>(key).checked = store.settings[key];
  dirty = false;
  status.textContent = '';
}
function discard(): boolean {
  return !dirty || confirm(t('discardChanges'));
}
async function persist(next: Store): Promise<void> {
  await saveStore(next);
  store = next;
}
function perform(task: () => Promise<void>, target = status): void {
  if (busy) return;
  busy = true;
  void task()
    .catch((error) => report(error, target))
    .finally(() => {
      busy = false;
    });
}
editor.addEventListener('input', () => {
  dirty = true;
  status.textContent = t('unsaved');
});
editor.addEventListener('change', () => {
  dirty = true;
});
window.addEventListener('beforeunload', (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
editor.addEventListener('submit', (event) => {
  event.preventDefault();
  perform(async () => {
    const next = structuredClone(store),
      profile = next.profiles.find((p) => p.id === selectedId)!;
    profile.name = byId<HTMLInputElement>('profileName').value.trim();
    profile.domains = byId<HTMLInputElement>('domains')
      .value.split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    for (const key of fieldKeys)
      profile.fields[key] = byId<HTMLInputElement>('field-' + key).value;
    profile.customRules = [
      ...byId('rules').querySelectorAll<HTMLElement>('.rule'),
    ].map((row) => ({
      id: row.dataset.ruleId!,
      keywords: row.querySelector<HTMLInputElement>('[data-part=keywords]')!
        .value,
      value: row.querySelector<HTMLInputElement>('[data-part=value]')!.value,
      mode: row.querySelector<HTMLSelectElement>('[data-part=mode]')!.value as
        'exact' | 'contains',
    }));
    await persist(validateStore(next));
    render();
    status.textContent = t('saved');
  });
});
byId('newProfile').addEventListener('click', () => {
  if (!discard()) return;
  perform(async () => {
    const next = structuredClone(store),
      profile = newProfile(t('newProfileName'));
    next.profiles.push(profile);
    await persist(validateStore(next));
    selectedId = profile.id;
    render();
    byId<HTMLInputElement>('profileName').select();
  });
});
byId('duplicate').addEventListener('click', () => {
  if (!discard()) return;
  perform(async () => {
    const next = structuredClone(store),
      profile = structuredClone(current());
    profile.id = crypto.randomUUID();
    profile.name = (profile.name.slice(0, 80) + ' ' + t('copySuffix')).slice(
      0,
      100,
    );
    profile.customRules.forEach((r) => {
      r.id = crypto.randomUUID();
    });
    next.profiles.push(profile);
    await persist(validateStore(next));
    selectedId = profile.id;
    render();
  });
});
byId('delete').addEventListener('click', () => {
  if (
    store.profiles.length <= 1 ||
    !confirm(t('confirmDelete', current().name))
  )
    return;
  perform(async () => {
    const next = structuredClone(store);
    next.profiles = next.profiles.filter((p) => p.id !== selectedId);
    if (next.defaultProfileId === selectedId)
      next.defaultProfileId = next.profiles[0]!.id;
    if (next.activeProfileId === selectedId)
      next.activeProfileId = next.defaultProfileId;
    await persist(next);
    selectedId = next.defaultProfileId;
    render();
  });
});
byId('makeDefault').addEventListener('click', () => {
  if (!discard()) return;
  perform(async () => {
    await persist({
      ...store,
      defaultProfileId: selectedId,
      activeProfileId: selectedId,
    });
    render();
    status.textContent = t('saved');
  });
});
byId('addRule').addEventListener('click', () => {
  if (byId('rules').children.length >= 100) {
    status.textContent = t('invalidSchema');
    return;
  }
  const row = ruleRow({
    id: crypto.randomUUID(),
    keywords: '',
    value: '',
    mode: 'contains',
  });
  byId('rules').append(row);
  row.querySelector('input')?.focus();
  dirty = true;
});
for (const key of ['overwrite', 'highlight', 'diagnostic'] as const)
  byId(key).addEventListener('change', () =>
    perform(async () => {
      const next = structuredClone(store);
      next.settings[key] = byId<HTMLInputElement>(key).checked;
      await persist(next);
      byId('settingsStatus').textContent = t('saved');
    }, byId('settingsStatus')),
  );
byId('export').addEventListener('click', () => {
  if (!confirm(t('exportWarning'))) return;
  perform(async () => {
    const latest = await loadStore();
    const url = URL.createObjectURL(
      new Blob([exportStore(latest)], { type: 'application/json' }),
    );
    const link = element('a');
    link.href = url;
    link.download = 'fieldhand-profiles.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    byId('transferStatus').textContent = t('exported');
  }, byId('transferStatus'));
});
byId('import').addEventListener('click', () => {
  if (discard()) byId<HTMLInputElement>('importFile').click();
});
byId('importFile').addEventListener('change', () =>
  perform(async () => {
    const input = byId<HTMLInputElement>('importFile'),
      file = input.files?.[0];
    input.value = '';
    pendingImport = undefined;
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) throw new Error('fileTooLarge');
    pendingImport = parseImport(await file.text());
    byId('importSummary').replaceChildren(
      ...pendingImport.profiles.map((p) =>
        element(
          'li',
          t('profilePreview', [
            p.name,
            String(Object.values(p.fields).filter(Boolean).length),
            String(p.customRules.length),
          ]),
        ),
      ),
    );
    dialog.showModal();
  }, byId('transferStatus')),
);
for (const mode of ['merge', 'replace'] as const)
  byId(mode).addEventListener('click', () =>
    perform(async () => {
      if (!pendingImport) return;
      const next =
        mode === 'replace'
          ? pendingImport
          : mergeStores(await loadStore(), pendingImport);
      await persist(next);
      selectedId = store.defaultProfileId;
      render();
      pendingImport = undefined;
      dialog.close();
      byId('transferStatus').textContent = t('imported');
    }, byId('transferStatus')),
  );
byId('cancelImport').addEventListener('click', () => {
  pendingImport = undefined;
  dialog.close();
});
dialog.addEventListener('cancel', () => {
  pendingImport = undefined;
});
void (async () => {
  try {
    store = await loadStore();
    const saved = await chrome.storage.local.get('fieldhand');
    if (!saved.fieldhand) {
      store = initialStore(t('personalProfile'));
      await saveStore(store);
    }
    selectedId = store.defaultProfileId;
    render();
  } catch (error) {
    report(error, status);
    editor
      .querySelectorAll<HTMLInputElement | HTMLButtonElement>('input,button')
      .forEach((input) => {
        input.disabled = true;
      });
  }
})();
