// =============================================
// Ride — Editor (Monaco)
// =============================================
const path = require('path');

const LANG_MAP = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
  py: 'python', pyw: 'python',
  c: 'c', h: 'c',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
  cs: 'csharp',
  java: 'java',
  kt: 'kotlin',
  rs: 'rust',
  go: 'go',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell',
  ps1: 'powershell',
  json: 'json', jsonc: 'json',
  yaml: 'yaml', yml: 'yaml',
  toml: 'ini',
  xml: 'xml', svg: 'xml', html: 'html', htm: 'html',
  css: 'css', scss: 'scss', sass: 'scss', less: 'less',
  md: 'markdown', mdx: 'markdown',
  sql: 'sql',
  lua: 'lua',
  r: 'r',
  dart: 'dart',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  cmake: 'cmake',
  asm: 'asm', s: 'asm',
  txt: 'plaintext', log: 'plaintext',
};

const LANG_ICONS = {
  javascript:'🟨', typescript:'🔷', python:'🐍', c:'🔵', cpp:'🟣',
  rust:'🦀', go:'🐹', java:'☕', kotlin:'🎯', shell:'🐚',
  json:'{}', yaml:'📋', html:'🌐', css:'🎨', markdown:'📝',
  sql:'🗄', lua:'🌙', ruby:'💎', php:'🐘', dockerfile:'🐳',
  plaintext:'📄',
};

function getLang(filePath) {
  if (!filePath) return 'plaintext';
  const base = path.basename(filePath).toLowerCase();
  if (base === 'dockerfile') return 'dockerfile';
  if (base === 'makefile' || base === 'gnumakefile') return 'makefile';
  const ext = base.split('.').pop();
  return LANG_MAP[ext] || 'plaintext';
}

function getLangIcon(lang) {
  return LANG_ICONS[lang] || '📄';
}

// ---- Monaco loader ----
let monacoEditor = null;
let editorSettings = {
  fontSize: 14,
  tabSize: 4,
  wordWrap: 'off',
  minimap: true,
  lineNumbers: 'on',
};

function initMonaco(callback) {
  const script = document.createElement('script');
  script.src = 'vendor/vs/loader.js';
  script.onload = () => {
    window.require.config({ paths: { vs: 'vendor/vs' } });
    window.require(['vs/editor/editor.main'], () => {

      monaco.editor.defineTheme('ride-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment',        foreground: '555555', fontStyle: 'italic' },
          { token: 'keyword',        foreground: 'e63946', fontStyle: 'bold' },
          { token: 'string',         foreground: 'a8d8a8' },
          { token: 'number',         foreground: 'f4c87a' },
          { token: 'type',           foreground: '79b8ff' },
          { token: 'function',       foreground: 'dcdcaa' },
          { token: 'variable',       foreground: 'cccccc' },
          { token: 'operator',       foreground: 'e63946' },
          { token: 'delimiter',      foreground: 'cccccc' },
          { token: 'tag',            foreground: 'f97583' },
          { token: 'attribute.name', foreground: 'b392f0' },
        ],
        colors: {
          'editor.background':                   '#0e0e0e',
          'editor.foreground':                   '#cccccc',
          'editorLineNumber.foreground':         '#404040',
          'editorLineNumber.activeForeground':   '#888888',
          'editor.selectionBackground':          '#1e3a5f',
          'editor.lineHighlightBackground':      '#161616',
          'editorCursor.foreground':             '#e63946',
          'editorWhitespace.foreground':         '#2a2a2a',
          'editorIndentGuide.background':        '#222222',
          'editorIndentGuide.activeBackground':  '#333333',
          'editor.findMatchBackground':          '#e6394640',
          'editor.findMatchHighlightBackground': '#e6394620',
          'editorBracketMatch.background':       '#e6394625',
          'editorBracketMatch.border':           '#e63946',
          'scrollbarSlider.background':          '#2a2a2a88',
          'scrollbarSlider.hoverBackground':     '#3a3a3a',
          'editorGutter.background':             '#0e0e0e',
          'minimap.background':                  '#0e0e0e',
          'editorWidget.background':             '#1c1c1c',
          'editorWidget.border':                 '#333333',
          'input.background':                    '#1a1a1a',
          'input.border':                        '#333333',
          'focusBorder':                         '#e63946',
          'list.hoverBackground':                '#1e1e1e',
          'list.activeSelectionBackground':      '#1e3a5f',
        }
      });

      monacoEditor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: '',
        language: 'plaintext',
        theme: 'ride-dark',
        fontSize: editorSettings.fontSize,
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        lineNumbers: editorSettings.lineNumbers,
        wordWrap: editorSettings.wordWrap,
        minimap: { enabled: editorSettings.minimap },
        tabSize: editorSettings.tabSize,
        insertSpaces: true,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        mouseWheelZoom: true,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        suggest: { preview: true },
        inlineSuggest: { enabled: true },
        formatOnPaste: true,
        padding: { top: 8 },
        renderLineHighlight: 'gutter',
        overviewRulerBorder: false,
        hideCursorInOverviewRuler: true,
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      });

      // cursor → statusbar
      monacoEditor.onDidChangeCursorPosition(e => {
        document.getElementById('sb-cursor').textContent =
          `Ln ${e.position.lineNumber}, Col ${e.position.column}`;
      });

      // mark modified
      monacoEditor.onDidChangeModelContent(() => {
        if (window.Tabs && window.Tabs.activeTab()) {
          window.Tabs.markModified(window.Tabs.activeTab().id, true);
        }
      });

      // make editor visible and fill the container
      document.getElementById('monaco-editor').style.display = 'block';
      monacoEditor.layout();

      // expose globally
      window.monacoEditor = monacoEditor;
      window.dispatchEvent(new Event('monaco:ready'));

      if (callback) callback();
    });
  };
  document.head.appendChild(script);
}

function openInEditor(filePath, content) {
  if (!monacoEditor) return null;

  const lang = getLang(filePath);
  const uriStr = 'file:///' + (filePath || 'untitled').replace(/\\/g, '/').replace(/^\/+/, '');
  const uri = monaco.Uri.parse(uriStr);

  let model = monaco.editor.getModel(uri);
  if (!model) {
    model = monaco.editor.createModel(content, lang, uri);
  } else {
    if (model.getValue() !== content) model.setValue(content);
    monaco.editor.setModelLanguage(model, lang);
  }
  monacoEditor.setModel(model);
  monacoEditor.focus();

  // show editor, hide welcome
  document.getElementById('welcome-screen').style.display = 'none';
  document.getElementById('monaco-editor').style.display  = 'block';

  // statusbar
  const langLabel = lang.charAt(0).toUpperCase() + lang.slice(1);
  document.getElementById('sb-lang').textContent   = langLabel;
  document.getElementById('sb-spaces').textContent = `Spaces: ${editorSettings.tabSize}`;

  window.monacoEditor = monacoEditor;
  return { lang, icon: getLangIcon(lang) };
}

function getEditorContent() {
  return monacoEditor ? monacoEditor.getValue() : '';
}

function applySettings(s) {
  editorSettings = { ...editorSettings, ...s };
  if (!monacoEditor) return;
  monacoEditor.updateOptions({
    fontSize:    editorSettings.fontSize,
    wordWrap:    editorSettings.wordWrap,
    tabSize:     editorSettings.tabSize,
    lineNumbers: editorSettings.lineNumbers,
    minimap:     { enabled: editorSettings.minimap === 'on' || editorSettings.minimap === true },
  });
}

window.Editor = { initMonaco, openInEditor, getEditorContent, applySettings, getLang, getLangIcon };
