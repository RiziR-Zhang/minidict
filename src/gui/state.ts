import type { Config } from '../types.js';
import { availablePlugins } from '../translate.js';

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

export interface GuiDefaults {
  plugins: string[];
  showExamples: boolean;
  showPhonetic: boolean;
  maxExamples: number;
  timeout: number;
  cacheEnabled: boolean;
}

export interface GuiState {
  plugins: string[];
  defaults: GuiDefaults;
}

export interface GuiTranslateRequest {
  word: string;
  plugins: string[];
  showExamples: boolean;
  showPhonetic: boolean;
  maxExamples: number;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value === null) return fallback;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return fallback;
}

function splitPluginValues(values: string[]): string[] {
  return values
    .flatMap(value => value.split(','))
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
}

function uniquePlugins(values: string[]): string[] {
  const plugins: string[] = [];
  for (const plugin of splitPluginValues(values)) {
    if (!plugins.includes(plugin)) {
      plugins.push(plugin);
    }
  }
  return plugins;
}

function guiPluginNames(config: Config, pluginNames: string[]): string[] {
  return uniquePlugins([...pluginNames, ...config.plugins]);
}

export function normalizePluginSelection(
  requested: string[],
  pluginNames: string[],
  fallback: string[]
): string[] {
  const known = new Set(pluginNames);
  const selected: string[] = [];

  for (const plugin of splitPluginValues(requested)) {
    if (known.has(plugin) && !selected.includes(plugin)) {
      selected.push(plugin);
    }
  }

  return selected.length > 0 ? selected : [...fallback];
}

export function createGuiState(
  config: Config,
  pluginNames: string[] = availablePlugins()
): GuiState {
  const plugins = guiPluginNames(config, pluginNames);
  const fallbackPlugins = [...plugins];
  const selectedPlugins = normalizePluginSelection(config.plugins, plugins, fallbackPlugins);

  return {
    plugins,
    defaults: {
      plugins: selectedPlugins,
      showExamples: config.showExamples,
      showPhonetic: config.showPhonetic,
      maxExamples: config.maxExamples,
      timeout: config.timeout ?? 10000,
      cacheEnabled: config.cache?.enabled ?? true
    }
  };
}

export function parseTranslateRequest(
  params: URLSearchParams,
  config: Config,
  pluginNames: string[] = availablePlugins()
): GuiTranslateRequest {
  const state = createGuiState(config, pluginNames);
  const plugins = state.plugins;
  const requestedPlugins = [...params.getAll('plugin'), ...params.getAll('plugins')];
  const selectedPlugins =
    requestedPlugins.length > 0
      ? normalizePluginSelection(requestedPlugins, plugins, state.defaults.plugins)
      : state.defaults.plugins;

  return {
    word: (params.get('word') ?? params.get('q') ?? '').trim(),
    plugins: selectedPlugins,
    showExamples: parseBoolean(params.get('showExamples'), state.defaults.showExamples),
    showPhonetic: parseBoolean(params.get('showPhonetic'), state.defaults.showPhonetic),
    maxExamples: parsePositiveInt(params.get('maxExamples'), state.defaults.maxExamples)
  };
}

export function buildTranslateConfig(baseConfig: Config, request: GuiTranslateRequest): Config {
  return {
    ...baseConfig,
    plugins: [...request.plugins],
    showExamples: request.showExamples,
    showPhonetic: request.showPhonetic,
    maxExamples: request.maxExamples,
    cache: baseConfig.cache ? { ...baseConfig.cache } : undefined,
    autoUpdate: baseConfig.autoUpdate ? { ...baseConfig.autoUpdate } : undefined,
    externalPlugins: baseConfig.externalPlugins ? [...baseConfig.externalPlugins] : undefined
  };
}

export function serializeSseEvent(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}
