import {
  test,
  expect,
  chromium,
  type BrowserContext,
  type Worker,
  type Page,
} from '@playwright/test';
import { build } from 'esbuild';
import { readFile, mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  initialStore,
  type Store,
  type Profile,
  type Settings,
} from '../../src/storage/schema';

let context: BrowserContext,
  worker: Worker,
  extensionId: string,
  profileDir: string,
  frameworkBundle: string;
const pageErrors: string[] = [],
  extensionNetwork: string[] = [];
test.beforeAll(async () => {
  const result = await build({
    entryPoints: ['tests/fixtures/frameworks.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    alias: { vue: 'vue/dist/vue.esm-bundler.js' },
    define: {
      'process.env.NODE_ENV': '"development"',
      __VUE_OPTIONS_API__: 'true',
      __VUE_PROD_DEVTOOLS__: 'false',
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
    },
  });
  frameworkBundle = result.outputFiles[0]!.text;
  profileDir = await mkdtemp(path.join(tmpdir(), 'fieldhand-test-'));
  const extensionPath = path.resolve('dist');
  context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chromium',
    headless: true,
    locale: 'en-US',
    viewport: { width: 1400, height: 1500 },
    args: [
      '--lang=en-US',
      '--enable-unsafe-extension-debugging',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  context.on('request', (request) => {
    if (!request.url().startsWith('http')) return;
    const worker = request.serviceWorker();
    if (
      worker?.url().startsWith('chrome-extension:') ||
      (!worker && request.frame().url().startsWith('chrome-extension:'))
    )
      extensionNetwork.push(request.url());
  });
  context.on('page', (page) =>
    page.on('pageerror', (error) => pageErrors.push(error.message)),
  );
  worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker'));
  extensionId = worker.url().split('/')[2]!;
  await context.route(/^https?:\/\/forms\.test\//, async (route) => {
    const name = new URL(route.request().url()).pathname;
    if (name === '/frameworks.js')
      return route.fulfill({
        body: frameworkBundle,
        contentType: 'application/javascript',
      });
    const filename =
      name === '/frame.html'
        ? 'frame.html'
        : name === '/fixture.js'
          ? 'fixture.js'
          : 'forms.html';
    await route.fulfill({
      body: await readFile(path.resolve('tests/fixtures', filename)),
      contentType: filename.endsWith('.js')
        ? 'application/javascript'
        : 'text/html',
    });
  });
  await context.route('https://other.test/**', (route) =>
    route.fulfill({
      body: '<label>Email<input type="email" id="foreign-email"></label>',
      contentType: 'text/html',
    }),
  );
});
test.afterAll(async () => {
  await context?.close();
  if (profileDir) await rm(profileDir, { recursive: true, force: true });
});
function data(): Store {
  const store = initialStore('Personal'),
    p = store.profiles[0]!;
  Object.assign(p.fields, {
    honorific: 'Monsieur',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test',
    phone: '+33102030405',
    birthDate: '1990-12-31',
    address1: '12 rue des Fleurs',
    address2: 'Apt 3',
    postalCode: '75001',
    city: 'Paris',
    region: 'Île-de-France',
    country: 'FRA',
    company: 'Analytical Engines',
    jobTitle: 'Engineer',
    website: 'https://example.test',
    linkedin: 'https://linkedin.com/in/example',
  });
  p.customRules = [
    {
      id: 'reference',
      keywords: 'référence dossier',
      value: 'ABC-123',
      mode: 'exact',
    },
  ];
  store.settings.highlight = false;
  return store;
}
async function seed(store = data()) {
  await worker.evaluate(
    (value) => chrome.storage.local.set({ fieldhand: value }),
    store,
  );
}
async function invoke(
  page: Page,
  action: 'fill' | 'undo' | 'status',
  extra = {},
) {
  await page.bringToFront();
  return worker.evaluate(
    async (args) => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error('No active tab');
      // Le protocole CDP active le geste utilisateur sans ajouter de permission au manifeste.
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      if (!results.length) throw new Error('Injection failed');
      return chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          func: (action: string, profile: Profile, settings: Settings) =>
            action === 'undo'
              ? window.__fieldhand!.undo()
              : action === 'status'
                ? window.__fieldhand!.status()
                : window.__fieldhand!.fill(profile, settings),
          args: [args.action, args.store.profiles[0]!, args.store.settings],
        })
        .then((r) => r[0]!.result);
    },
    { action, store: { ...data(), ...extra } },
  );
}
async function grant(
  page: Page,
  action: 'fill' | 'undo' = 'fill',
  confirmHttp = false,
): Promise<void> {
  // Ouvre réellement l'action du navigateur : activeTab reste une permission temporaire.
  await page.bringToFront();
  const session = await context.newCDPSession(page);
  const browserSession = await context.browser()!.newBrowserCDPSession();
  const { targetInfos } = await browserSession.send('Target.getTargets', {
    filter: [{ type: 'tab' }],
  });
  const targetInfo = targetInfos.find((info) => info.url === page.url());
  if (!targetInfo) throw new Error(JSON.stringify(targetInfos));
  await browserSession.send('Extensions.triggerAction', {
    id: extensionId,
    targetId: targetInfo.targetId,
  });
  const targets = () =>
    browserSession.send('Target.getTargets', { filter: [{}] });
  await expect
    .poll(async () =>
      (await targets()).targetInfos.some((p) => p.url.includes('popup.html')),
    )
    .toBe(true);
  const popup = (await targets()).targetInfos.find(
    (p) => p.url.includes('popup.html') && p.type === 'page',
  )!;
  const attached = await browserSession.send('Target.attachToTarget', {
    targetId: popup.targetId,
    flatten: false,
  });
  let sequence = 0;
  async function remote(
    method: string,
    params: object = {},
  ): Promise<Record<string, unknown>> {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        browserSession.off('Target.receivedMessageFromTarget', listener);
        reject(new Error('Popup protocol timeout'));
      }, 5000);
      const listener = (event: { sessionId: string; message: string }) => {
        const response = JSON.parse(event.message);
        if (event.sessionId !== attached.sessionId || response.id !== id)
          return;
        clearTimeout(timer);
        browserSession.off('Target.receivedMessageFromTarget', listener);
        if (response.error) reject(new Error(response.error.message));
        else resolve(response.result);
      };
      browserSession.on('Target.receivedMessageFromTarget', listener);
      void browserSession
        .send('Target.sendMessageToTarget', {
          sessionId: attached.sessionId,
          message: JSON.stringify({ id, method, params }),
        })
        .catch(reject);
    });
  }
  async function evaluate(expression: string): Promise<unknown> {
    const response = await remote('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    return (response.result as { value?: unknown })?.value;
  }
  await expect
    .poll(() =>
      evaluate(
        '!!document.querySelector("#profile")?.options.length && !document.querySelector("#fill").disabled',
      ),
    )
    .toBe(true);
  if (confirmHttp)
    await evaluate('document.querySelector("#confirmHttp").checked = true');
  await evaluate(`document.querySelector("#${action}").click()`);
  const expected =
    action === 'undo'
      ? /controls restored|contrôles restaurés/
      : page.url().startsWith('http:') && !confirmHttp
        ? /Confirm|Confirmez/
        : /fields filled|champs remplis/;
  await expect
    .poll(() => evaluate('document.querySelector("#status").textContent'))
    .toMatch(expected);
  await expect
    .poll(() => evaluate('!document.querySelector("#fill").disabled'))
    .toBe(true);
  await mkdir('test-results/screenshots', { recursive: true });
  const screenshot = await remote('Page.captureScreenshot');
  await writeFile(
    'test-results/screenshots/popup.png',
    Buffer.from(screenshot.data as string, 'base64'),
  );
  await browserSession.send('Target.closeTarget', { targetId: popup.targetId });
  await expect
    .poll(async () =>
      (await targets()).targetInfos.some((t) => t.targetId === popup.targetId),
    )
    .toBe(false);
  await browserSession.detach();
  await session.detach();
}
test('loads MV3 with only the approved permissions', async () => {
  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  expect(manifest.permissions).toEqual(['storage', 'activeTab', 'scripting']);
  expect(manifest.content_scripts).toBeUndefined();
  expect(manifest.host_permissions).toBeUndefined();
});
test('fills, updates React/Vue/Angular state, excludes sensitive fields, and undoes exactly', async () => {
  await seed();
  const page = await context.newPage();
  await page.goto('https://forms.test/');
  await expect(page.locator('#angular-valid')).toHaveText('false');
  await grant(page);
  await expect(page.locator('#first')).toHaveValue('Ada');
  for (const id of ['react', 'vue', 'angular'])
    await expect(page.locator(`#${id}-state`)).toHaveText('ada@example.test');
  await expect(page.locator('#angular-valid')).toHaveText('true');
  await expect(page.locator('#country')).toHaveValue('FR');
  await expect(page.locator('#birth')).toHaveValue('1990-12-31');
  await expect(page.locator('#placeholder')).toHaveValue('31/12/1990');
  await expect(page.locator('#reference')).toHaveValue('ABC-123');
  await expect(page.locator('#city')).toHaveValue('Already entered');
  await expect(page.locator('#mr')).toBeChecked();
  await expect(page.locator('#shadow-email')).toHaveValue('ada@example.test');
  await expect(
    page.frameLocator('#sameOrigin').locator('#frame-email'),
  ).toHaveValue('ada@example.test');
  await expect(
    page.frameLocator('#crossOrigin').locator('#foreign-email'),
  ).toHaveValue('');
  for (const id of [
    'password',
    'card',
    'iban',
    'username',
    'cvv',
    'otp',
    'hidden',
    'transparent',
    'offscreen',
    'disabled',
    'readonly',
    'typehidden',
    'clipped',
    'visibilityHidden',
    'zeroSize',
    'disabledFieldset',
  ])
    await expect(page.locator('#' + id)).toHaveValue('');
  await expect(page.locator('#terms')).not.toBeChecked();
  const status = await invoke(page, 'status');
  expect(status!.skippedFrames).toBe(1);
  expect(status!.count).toBeGreaterThan(20);
  await grant(page, 'undo');
  await expect(page.locator('#first')).toHaveValue('');
  await expect(page.locator('#city')).toHaveValue('Already entered');
  await expect(page.locator('#mr')).not.toBeChecked();
  for (const id of ['react', 'vue', 'angular'])
    await expect(page.locator(`#${id}-state`)).toHaveText('');
  await page.close();
});
test('profile editor saves, duplicates, defaults, deletes, validates imports, and exports', async () => {
  await seed();
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/options.html`);
  await page.locator('#newProfile').click();
  await page.locator('#profileName').fill('Work');
  await page.locator('#field-firstName').fill('Grace');
  await page.locator('#field-email').fill('grace@example.test');
  await page.locator('button[type=submit]').click();
  await expect(page.locator('#saveStatus')).toHaveText(
    /Saved on this device|Enregistré sur cet appareil/,
  );
  await page.locator('#duplicate').click();
  await expect(page.locator('#profileName')).toHaveValue(
    /Work \((copy|copie)\)/,
  );
  await page.locator('#makeDefault').click();
  await expect(page.locator('#makeDefault')).toBeDisabled();
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('#delete').click();
  await expect(page.locator('#profiles button')).toHaveCount(2);
  await page.locator('#importFile').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":9}'),
  });
  await expect(page.locator('#transferStatus')).toContainText(
    /Invalid profile|Profil invalide/,
  );
  await page.locator('#importFile').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data())),
  });
  await expect(page.locator('#importDialog')).toBeVisible();
  await page.locator('#merge').click();
  await expect(page.locator('#profiles button')).toHaveCount(3);
  page.once('dialog', (dialog) => dialog.accept());
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('fieldhand-profiles.json');
  await mkdir('test-results/screenshots', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/screenshots/options.png',
    fullPage: true,
  });
  await page.close();
});
test('100 visible fields fill within 200 ms', async () => {
  await seed();
  const page = await context.newPage();
  await page.goto('https://forms.test/');
  await page.evaluate(() => {
    document.body.replaceChildren();
    for (let i = 0; i < 100; i++) {
      const input = document.createElement('input');
      input.type = 'email';
      input.style.cssText = 'width:100px;height:25px';
      document.body.append(input);
    }
  });
  await grant(page);
  const result = await invoke(page, 'status');
  expect(result!.count).toBe(100);
  expect(result!.duration).toBeLessThan(200);
  await invoke(page, 'undo');
  await expect(page.locator('input').first()).toHaveValue('');
  await page.close();
});
test('overwrite, radio snapshots, and no-op fills preserve exact undo', async () => {
  const store = data();
  store.settings.overwrite = true;
  await seed(store);
  const page = await context.newPage();
  await page.goto('https://forms.test/');
  await expect(page.locator('#angular-valid')).toHaveText('false');
  await page.locator('#ms').check();
  await page.locator('#first').fill('Original');
  await grant(page);
  await expect(page.locator('#first')).toHaveValue('Ada');
  await expect(page.locator('#city')).toHaveValue('Paris');
  await expect(page.locator('#mr')).toBeChecked();
  await grant(page);
  const result = await invoke(page, 'status');
  expect(result!.count).toBe(0);
  expect(result!.undoAvailable).toBe(true);
  await grant(page, 'undo');
  await expect(page.locator('#first')).toHaveValue('Original');
  await expect(page.locator('#city')).toHaveValue('Already entered');
  await expect(page.locator('#ms')).toBeChecked();
  await page.close();
});
test('HTTP requires explicit acknowledgement in the popup', async () => {
  await seed();
  const page = await context.newPage();
  await page.goto('http://forms.test/');
  await grant(page);
  await expect(page.locator('#first')).toHaveValue('');
  await grant(page, 'fill', true);
  await expect(page.locator('#first')).toHaveValue('Ada');
  await page.close();
});
test('extension sends no network requests and pages have no uncaught errors', () => {
  expect(extensionNetwork).toEqual([]);
  expect(pageErrors).toEqual([]);
});
