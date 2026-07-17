import type { Config } from '../src/types.js';
import {
  buildTranslateConfig,
  createGuiState,
  normalizePluginSelection,
  parseTranslateRequest,
  serializeSseEvent
} from '../src/gui/state.js';

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    plugins: ['bing', 'ghost', 'youdao'],
    showPhonetic: true,
    showExamples: false,
    maxExamples: 3,
    timeout: 10000,
    cache: { enabled: true, ttl: 1000 },
    externalPlugins: [],
    ...overrides
  };
}

describe('gui state helpers', () => {
  it('keeps only known plugins while preserving configured order', () => {
    expect(
      normalizePluginSelection(['google,bing', 'bing', 'ghost'], ['bing', 'google'], [])
    ).toEqual(['google', 'bing']);
  });

  it('builds GUI state from config defaults', () => {
    const state = createGuiState(baseConfig(), ['bing', 'youdao', 'google']);

    expect(state.plugins).toEqual(['bing', 'youdao', 'google', 'ghost']);
    expect(state.defaults.plugins).toEqual(['bing', 'ghost', 'youdao']);
    expect(state.defaults.showExamples).toBe(false);
    expect(state.defaults.showPhonetic).toBe(true);
    expect(state.defaults.maxExamples).toBe(3);
    expect(state.defaults.cacheEnabled).toBe(true);
  });

  it('keeps configured external plugin names selectable in the GUI', () => {
    const state = createGuiState(baseConfig({ plugins: ['myplugin'] }), ['bing', 'youdao']);

    expect(state.plugins).toEqual(['bing', 'youdao', 'myplugin']);
    expect(state.defaults.plugins).toEqual(['myplugin']);
  });

  it('parses translate query params and falls back to config defaults', () => {
    const params = new URLSearchParams({
      word: ' hello ',
      plugin: 'google,nope',
      showExamples: '1',
      maxExamples: '5'
    });

    const request = parseTranslateRequest(params, baseConfig(), ['bing', 'youdao', 'google']);

    expect(request).toEqual({
      word: 'hello',
      plugins: ['google'],
      showExamples: true,
      showPhonetic: true,
      maxExamples: 5
    });
  });

  it('creates an isolated translate config for the request', () => {
    const config = baseConfig();
    const request = parseTranslateRequest(
      new URLSearchParams('q=world&plugins=bing&showExamples=true'),
      config,
      ['bing', 'youdao']
    );

    const translateConfig = buildTranslateConfig(config, request);

    expect(translateConfig.plugins).toEqual(['bing']);
    expect(translateConfig.showExamples).toBe(true);
    expect(translateConfig.cache).not.toBe(config.cache);
  });

  it('serializes SSE events as one complete frame', () => {
    expect(serializeSseEvent('result', { ok: true })).toBe('event: result\ndata: {"ok":true}\n\n');
  });
});
