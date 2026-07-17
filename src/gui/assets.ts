export const APP_HTML = String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>minidict</title>
    <link rel="stylesheet" href="/assets/app.css" />
  </head>
  <body>
    <main class="app">
      <form id="searchForm" class="search" autocomplete="off">
        <div class="query-row">
          <input
            id="wordInput"
            name="word"
            type="search"
            placeholder="输入单词、短语或句子"
            aria-label="查询内容"
            autofocus
          />
          <button id="queryButton" type="submit">查询</button>
        </div>

        <div class="options">
          <fieldset class="source-group">
            <legend>词典源</legend>
            <div id="pluginList" class="plugin-list"></div>
          </fieldset>

          <label class="toggle">
            <input id="examplesToggle" type="checkbox" />
            <span>显示例句</span>
          </label>
        </div>
      </form>

      <div class="status-row" aria-live="polite">
        <span id="statusText">就绪</span>
      </div>

      <section id="results" class="results" aria-live="polite"></section>
    </main>

    <script type="module" src="/assets/app.js"></script>
  </body>
</html>
`;

export const APP_CSS = String.raw`:root {
  color-scheme: light;
  --bg: #f6f7f9;
  --surface: #ffffff;
  --surface-muted: #eef2f7;
  --text: #151923;
  --muted: #687386;
  --border: #d9e0ea;
  --accent: #2563eb;
  --accent-strong: #1d4ed8;
  --success: #047857;
  --danger: #b91c1c;
  --shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  font-family:
    "Microsoft YaHei",
    "Segoe UI",
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 360px;
  min-height: 100vh;
  color: var(--text);
  background: var(--bg);
}

.app {
  width: min(100%, 720px);
  min-height: 100vh;
  margin: 0 auto;
  padding: 18px;
}

.search {
  display: grid;
  gap: 12px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.query-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

input[type="search"] {
  width: 100%;
  min-height: 42px;
  padding: 0 12px;
  font: inherit;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  outline: none;
}

input[type="search"]:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

button {
  min-width: 72px;
  min-height: 42px;
  padding: 0 16px;
  font: inherit;
  font-weight: 700;
  color: #ffffff;
  background: var(--accent);
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background: var(--accent-strong);
}

button:disabled {
  cursor: wait;
  background: #8aa8e8;
}

.options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.source-group {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.source-group legend {
  margin-bottom: 6px;
  color: var(--muted);
  font-size: 12px;
}

.plugin-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.check,
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 0 10px;
  color: var(--text);
  background: var(--surface-muted);
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  user-select: none;
}

.check input,
.toggle input {
  width: 15px;
  height: 15px;
  accent-color: var(--accent);
}

.check:has(input:checked),
.toggle:has(input:checked) {
  color: var(--accent-strong);
  background: #eaf1ff;
  border-color: #bed2ff;
}

.status-row {
  min-height: 34px;
  display: flex;
  align-items: center;
  color: var(--muted);
  font-size: 13px;
}

.results {
  display: grid;
  gap: 10px;
  padding-bottom: 18px;
}

.result {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.06);
}

.result.error {
  border-color: #fecaca;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.plugin-name {
  font-size: 15px;
  font-weight: 800;
}

.badge {
  flex: none;
  color: var(--muted);
  font-size: 12px;
}

.badge.ok {
  color: var(--success);
}

.badge.error {
  color: var(--danger);
}

.phonetic {
  color: #7c3aed;
  font-size: 14px;
}

.translations,
.examples {
  display: grid;
  gap: 7px;
}

.translation {
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.example {
  display: grid;
  gap: 3px;
  padding: 8px 0 0;
  border-top: 1px solid var(--border);
}

.example-en {
  line-height: 1.5;
}

.example-zh,
.empty,
.error-text {
  color: var(--muted);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.error-text {
  color: var(--danger);
}

@media (max-width: 480px) {
  .app {
    padding: 12px;
  }

  .query-row {
    grid-template-columns: 1fr;
  }

  button {
    width: 100%;
  }
}
`;

export const APP_JS = String.raw`const form = document.getElementById('searchForm');
const wordInput = document.getElementById('wordInput');
const queryButton = document.getElementById('queryButton');
const pluginList = document.getElementById('pluginList');
const examplesToggle = document.getElementById('examplesToggle');
const statusText = document.getElementById('statusText');
const results = document.getElementById('results');

let activeSource = null;
let requestId = 0;
const urlParams = new URLSearchParams(window.location.search);
const existingClientId = urlParams.get('clientId');
const clientId =
  existingClientId ||
  (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + '-' + String(Math.random()));

if (!existingClientId) {
  urlParams.set('clientId', clientId);
  history.replaceState(null, '', window.location.pathname + '?' + urlParams.toString());
}

function createEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function setBusy(isBusy) {
  queryButton.disabled = isBusy;
  wordInput.disabled = isBusy;
}

function pluginLabel(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function selectedPlugins() {
  return Array.from(pluginList.querySelectorAll('input[type="checkbox"]:checked')).map(
    input => input.value
  );
}

function formatPhonetic(phonetic) {
  if (!phonetic) return '';
  if (typeof phonetic === 'string') return '[' + phonetic + ']';

  const parts = [];
  if (phonetic.uk) parts.push('英 [' + phonetic.uk + ']');
  if (phonetic.us) parts.push('美 [' + phonetic.us + ']');
  return parts.join('  ');
}

function renderPlugins(state) {
  pluginList.replaceChildren();

  if (!state.plugins.length) {
    pluginList.append(createEl('span', 'empty', '无可用词典'));
    return;
  }

  for (const name of state.plugins) {
    const label = createEl('label', 'check');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = name;
    input.checked = state.defaults.plugins.includes(name);
    label.append(input, document.createTextNode(pluginLabel(name)));
    pluginList.append(label);
  }
}

function renderResult(result) {
  const card = createEl('article', result.error ? 'result error' : 'result');
  const header = createEl('div', 'result-header');
  const title = createEl('div', 'plugin-name', result.pluginName || 'Unknown');
  const badge = createEl('span', result.error ? 'badge error' : 'badge ok', result.error ? '失败' : '完成');
  header.append(title, badge);
  card.append(header);

  if (result.error) {
    card.append(createEl('div', 'error-text', result.error));
    results.append(card);
    return;
  }

  const phoneticText = formatPhonetic(result.phonetic);
  if (phoneticText) {
    card.append(createEl('div', 'phonetic', phoneticText));
  }

  const translations = createEl('div', 'translations');
  if (result.translations && result.translations.length) {
    for (const text of result.translations) {
      translations.append(createEl('div', 'translation', text));
    }
  } else {
    translations.append(createEl('div', 'empty', '无释义'));
  }
  card.append(translations);

  if (examplesToggle.checked && result.examples && result.examples.length) {
    const examples = createEl('div', 'examples');
    for (const item of result.examples) {
      const example = createEl('div', 'example');
      example.append(createEl('div', 'example-en', item.en || ''));
      example.append(createEl('div', 'example-zh', item.zh || ''));
      examples.append(example);
    }
    card.append(examples);
  }

  results.append(card);
}

function stopActiveSource() {
  if (activeSource) {
    activeSource.close();
    activeSource = null;
  }
}

function lifecycleUrl(path) {
  return path + '?clientId=' + encodeURIComponent(clientId);
}

function heartbeat() {
  fetch(lifecycleUrl('/api/heartbeat'), {
    method: 'POST',
    keepalive: true
  }).catch(() => {});
}

function startQuery() {
  const word = wordInput.value.trim();
  const plugins = selectedPlugins();

  if (!word) {
    statusText.textContent = '请输入要查询的内容';
    wordInput.focus();
    return;
  }

  if (!plugins.length) {
    statusText.textContent = '请选择词典源';
    return;
  }

  stopActiveSource();
  results.replaceChildren();
  setBusy(true);
  statusText.textContent = '查询中...';

  const currentRequest = ++requestId;
  const params = new URLSearchParams();
  params.set('word', word);
  params.set('showExamples', examplesToggle.checked ? '1' : '0');
  for (const plugin of plugins) {
    params.append('plugin', plugin);
  }

  let count = 0;
  const source = new EventSource('/api/translate?' + params.toString());
  activeSource = source;

  source.addEventListener('result', event => {
    if (currentRequest !== requestId) return;
    count += 1;
    renderResult(JSON.parse(event.data));
    statusText.textContent = '已返回 ' + count + ' 个来源';
  });

  source.addEventListener('done', event => {
    if (currentRequest !== requestId) return;
    const payload = JSON.parse(event.data);
    statusText.textContent = payload.count ? '完成，' + payload.count + ' 个来源' : '没有结果';
    setBusy(false);
    stopActiveSource();
  });

  source.addEventListener('failure', event => {
    if (currentRequest !== requestId) return;
    const payload = JSON.parse(event.data);
    statusText.textContent = payload.message || '查询失败';
    setBusy(false);
    stopActiveSource();
  });

  source.onerror = () => {
    if (currentRequest !== requestId || source.readyState === EventSource.CLOSED) return;
    statusText.textContent = '连接中断';
    setBusy(false);
    stopActiveSource();
  };
}

async function init() {
  try {
    const response = await fetch('/api/state');
    const state = await response.json();
    renderPlugins(state);
    examplesToggle.checked = Boolean(state.defaults.showExamples);
    statusText.textContent = '就绪';
  } catch (error) {
    statusText.textContent = '启动失败';
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  startQuery();
});

window.addEventListener('beforeunload', stopActiveSource);
window.addEventListener('beforeunload', () => {
  navigator.sendBeacon(lifecycleUrl('/api/close'));
});

heartbeat();
setInterval(heartbeat, 2000);
void init();
`;
