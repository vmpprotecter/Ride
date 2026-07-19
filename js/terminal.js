// =============================================
// Ride — Terminal (xterm.js + node-pty)
// =============================================
(function () {
  const { ipcRenderer } = require('electron');
  let term = null;
  let pty  = null;
  let termReady = false;

  function loadXterm(callback) {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'vendor/xterm/xterm.css';
    document.head.appendChild(link);

    const s1 = document.createElement('script');
    s1.src = 'vendor/xterm/xterm.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'vendor/xterm/addon-fit.js';
      s2.onload = callback;
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  }

  function initTerminal() {
    if (termReady) return;
    const container = document.getElementById('terminal-container');
    if (!container) return;

    term = new Terminal({
      theme: {
        background:  '#0e0e0e',
        foreground:  '#cccccc',
        cursor:      '#e63946',
        cursorAccent:'#0e0e0e',
        black:       '#1a1a1a',
        red:         '#e63946',
        green:       '#39d353',
        yellow:      '#f4c87a',
        blue:        '#79b8ff',
        magenta:     '#b392f0',
        cyan:        '#56d4dd',
        white:       '#d0d0d0',
        brightBlack: '#444444',
        brightRed:   '#ff6b6b',
        brightGreen: '#5adb79',
        brightYellow:'#ffd079',
        brightBlue:  '#9eceff',
        brightMagenta:'#c9a8ff',
        brightCyan:  '#79e7ef',
        brightWhite: '#ffffff',
        selectionBackground: '#1e3a5f',
      },
      fontSize:    13,
      fontFamily:  "'JetBrains Mono','Fira Code','Consolas',monospace",
      fontWeight:  'normal',
      lineHeight:  1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      allowTransparency: true,
      scrollback:  5000,
    });

    const fitAddon = new window.FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    // spawn pty
    try {
      const ptyModule = require('node-pty');
      const os        = require('os');
      const shell     = process.env.SHELL || '/bin/bash';
      pty = ptyModule.spawn(shell, [], {
        name: 'xterm-256color',
        cols: term.cols,
        rows: term.rows,
        cwd:  os.homedir(),
        env:  Object.assign({}, process.env, {
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
        }),
      });

      pty.onData(data => term.write(data));
      term.onData(data => pty.write(data));
      term.onResize(({ cols, rows }) => pty.resize(cols, rows));

      // fit on panel resize
      new ResizeObserver(() => { try { fitAddon.fit(); pty.resize(term.cols, term.rows); } catch (_) {} })
        .observe(container);

    } catch (e) {
      term.writeln('\r\x1b[31m[Ride] node-pty not available. Run: npm install\x1b[0m');
      term.writeln('\r\x1b[33m' + e.message + '\x1b[0m');
    }

    termReady = true;
    window.dispatchEvent(new Event('terminal:ready'));
  }

  function clearTerminal() {
    if (term) { term.clear(); }
  }

  function showTerminal() {
    const panel = document.getElementById('bottom-panel');
    panel.style.display = 'flex';
    if (!termReady) initTerminal();
    else if (term) term.focus();
  }

  function hideTerminal() {
    document.getElementById('bottom-panel').style.display = 'none';
  }

  function toggleTerminal() {
    const panel = document.getElementById('bottom-panel');
    if (panel.style.display === 'none' || panel.style.display === '') {
      showTerminal();
    } else {
      hideTerminal();
    }
  }

  // Panel tab switching
  document.querySelectorAll('.panel-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.panel-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('terminal-container').style.display = tab === 'terminal' ? 'block' : 'none';
      document.getElementById('problems-panel').style.display  = tab === 'problems'  ? 'flex'  : 'none';
      document.getElementById('output-panel').style.display    = tab === 'output'    ? 'flex'  : 'none';
      if (tab === 'terminal' && !termReady) initTerminal();
    });
  });

  document.getElementById('btn-close-panel')?.addEventListener('click', hideTerminal);
  document.getElementById('btn-clear-term')?.addEventListener('click', clearTerminal);
  document.getElementById('btn-new-term')?.addEventListener('click', () => {
    if (!termReady) initTerminal();
    else if (term) { clearTerminal(); term.focus(); }
  });

  // panel resize drag
  const resizeHandle = document.getElementById('panel-resize');
  const bottomPanel  = document.getElementById('bottom-panel');
  const editorCont   = document.getElementById('editor-panel-container');
  let isDragging = false;

  resizeHandle.addEventListener('mousedown', e => { isDragging = true; e.preventDefault(); });
  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const containerRect = editorCont.getBoundingClientRect();
    const newHeight = containerRect.bottom - e.clientY;
    if (newHeight > 60 && newHeight < containerRect.height - 60) {
      bottomPanel.style.height = newHeight + 'px';
      document.documentElement.style.setProperty('--panel-h', newHeight + 'px');
    }
  });
  document.addEventListener('mouseup', () => { isDragging = false; });

  // init xterm
  loadXterm(() => {
    // terminal starts hidden, opened on demand
    document.getElementById('bottom-panel').style.display = 'none';
  });

  window.Terminal2 = { showTerminal, hideTerminal, toggleTerminal, clearTerminal, initTerminal };
})();
