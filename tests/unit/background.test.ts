import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialStore } from '../../src/storage/schema';

const state = {
  store: initialStore(),
  url: 'https://example.test/form',
  scripts: 0,
};
let command: (name: string) => void;
let message: (
  request: unknown,
  sender: chrome.runtime.MessageSender,
  respond: (value: unknown) => void,
) => boolean | undefined;
const scripting = vi.fn(),
  badge = vi.fn(),
  openPopup = vi.fn();
beforeEach(async () => {
  vi.resetModules();
  state.store = initialStore();
  state.url = 'https://example.test/form';
  state.scripts = 0;
  scripting
    .mockReset()
    .mockImplementation(
      async (args: { files?: string[]; func?: () => unknown }) => {
        state.scripts++;
        return args.files
          ? [{ result: undefined }]
          : [
              {
                result: {
                  count: 3,
                  undoAvailable: true,
                  skippedFrames: 0,
                  duration: 1,
                },
              },
            ];
      },
    );
  badge.mockReset();
  openPopup.mockReset();
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn(async () => [{ id: 5, url: state.url }]),
      onUpdated: { addListener: vi.fn() },
    },
    scripting: { executeScript: scripting },
    storage: {
      local: {
        get: vi.fn(async () => ({ fieldhand: state.store })),
        set: vi.fn(),
        setAccessLevel: vi.fn(),
      },
    },
    i18n: { getMessage: (key: string) => key },
    runtime: {
      id: 'test-id',
      getURL: (path: string) => 'chrome-extension://test-id/' + path,
      onInstalled: { addListener: vi.fn() },
      onMessage: {
        addListener: (listener: typeof message) => {
          message = listener;
        },
      },
    },
    commands: {
      onCommand: {
        addListener: (listener: typeof command) => {
          command = listener;
        },
      },
    },
    action: {
      setBadgeText: badge,
      setBadgeBackgroundColor: vi.fn(),
      setTitle: vi.fn(),
      openPopup,
    },
  });
});
describe('background permissions and explicit actions', () => {
  it('refuses non-web pages before injection', async () => {
    const { execute } = await import('../../src/background/service-worker');
    for (const url of [
      'chrome://settings',
      'file:///data.html',
      'about:blank',
    ]) {
      state.url = url;
      expect(await execute({ action: 'fill' })).toEqual({
        error: 'unsupportedPage',
      });
    }
    expect(scripting).not.toHaveBeenCalled();
  });
  it('requires confirmation for HTTP fills, including the shortcut', async () => {
    const { execute } = await import('../../src/background/service-worker');
    state.url = 'http://example.test';
    expect(await execute({ action: 'fill' })).toEqual({
      error: 'insecurePage',
    });
    expect(scripting).not.toHaveBeenCalled();
    command('fill-form');
    await vi.waitFor(() => expect(openPopup).toHaveBeenCalled());
    expect(scripting).not.toHaveBeenCalled();
    expect(
      await execute({ action: 'fill', insecureConfirmed: true }),
    ).toMatchObject({ count: 3 });
  });
  it('fills and updates badge when the registered shortcut handler runs', async () => {
    await import('../../src/background/service-worker');
    command('other-command');
    expect(scripting).not.toHaveBeenCalled();
    command('fill-form');
    await vi.waitFor(() =>
      expect(badge).toHaveBeenCalledWith({ tabId: 5, text: '3' }),
    );
    expect(scripting.mock.calls[0]![0].files).toEqual(['content.js']);
  });
  it('accepts only extension UI messages', async () => {
    await import('../../src/background/service-worker');
    const respond = vi.fn();
    const sender = {
      id: 'test-id',
      url: 'chrome-extension://test-id/popup.html',
    };
    expect(
      message(
        { action: 'fill' },
        { ...sender, tab: { id: 2 } as chrome.tabs.Tab },
        respond,
      ),
    ).toBeUndefined();
    expect(
      message(
        { action: 'fill' },
        { id: 'other', url: 'https://evil.test' },
        respond,
      ),
    ).toBeUndefined();
    expect(message({ action: 'erase' }, sender, respond)).toBeUndefined();
    expect(message(null, sender, respond)).toBeUndefined();
    expect(scripting).not.toHaveBeenCalled();
    expect(message({ action: 'fill' }, sender, respond)).toBe(true);
    await vi.waitFor(() =>
      expect(respond).toHaveBeenCalledWith(
        expect.objectContaining({ count: 3 }),
      ),
    );
  });
  it('handles revoked permissions without exposing errors or data', async () => {
    const { execute } = await import('../../src/background/service-worker');
    scripting.mockRejectedValue(new Error('private detail'));
    expect(await execute({ action: 'fill' })).toEqual({
      error: 'operationFailed',
    });
  });
  it('does not send profile data when reading status', async () => {
    const { execute } = await import('../../src/background/service-worker');
    await execute({ action: 'status' });
    expect(scripting).toHaveBeenCalledTimes(1);
    expect(scripting.mock.calls[0]![0].args).toBeUndefined();
    expect(scripting.mock.calls[0]![0].files).toBeUndefined();
  });
});
