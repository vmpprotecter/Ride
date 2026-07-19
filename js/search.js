// =============================================
// Ride — Search in files
// =============================================
(function () {
  const fs       = require('fs');
  const nodePath = require('path');

  function searchInFiles(rootPath, query) {
    if (!rootPath || !query) return [];
    const results = [];
    function walk(dir) {
      let entries;
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
      entries.forEach(e => {
        const full = nodePath.join(dir, e.name);
        if (e.isDirectory()) {
          if (!['node_modules', '.git', '__pycache__', '.cache', 'dist', 'build'].includes(e.name)) walk(full);
        } else {
          try {
            const content = fs.readFileSync(full, 'utf8');
            const lines   = content.split('\n');
            const matches = [];
            lines.forEach((line, i) => {
              if (line.toLowerCase().includes(query.toLowerCase())) {
                matches.push({ line: i + 1, text: line.trim() });
              }
            });
            if (matches.length > 0) results.push({ file: full, name: e.name, matches });
          } catch (_) {}
        }
      });
    }
    walk(rootPath);
    return results;
  }

  function renderResults(results, query) {
    const container = document.getElementById('search-results');
    if (!container) return;
    if (!results.length) {
      container.innerHTML = '<div style="padding:12px;color:#555;font-size:12px;">No results found.</div>';
      return;
    }
    container.innerHTML = '';
    results.forEach(r => {
      const fileEl = document.createElement('div');
      fileEl.className = 'sr-file';
      fileEl.textContent = r.name;
      fileEl.title = r.file;
      container.appendChild(fileEl);

      r.matches.slice(0, 10).forEach(m => {
        const matchEl = document.createElement('div');
        matchEl.className = 'sr-match';
        const escaped = m.text.replace(/</g, '&lt;');
        const regex   = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        matchEl.innerHTML = `<span style="color:#555;margin-right:8px">${m.line}</span>${escaped.replace(regex, s => `<mark>${s}</mark>`)}`;
        matchEl.addEventListener('click', () => {
          window.Sidebar?.openFile(r.file, r.name);
          // jump to line after editor opens
          setTimeout(() => {
            if (window.Editor && monacoEditor) {
              monacoEditor.revealLineInCenter(m.line);
              monacoEditor.setPosition({ lineNumber: m.line, column: 1 });
              monacoEditor.focus();
            }
          }, 300);
        });
        container.appendChild(matchEl);
      });
    });
  }

  let searchTimeout = null;
  document.getElementById('search-input')?.addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query    = e.target.value.trim();
      const rootPath = window._rootPath || null;
      if (!query) { document.getElementById('search-results').innerHTML = ''; return; }
      const results = searchInFiles(rootPath, query);
      renderResults(results, query);
    }, 300);
  });

  document.getElementById('btn-search-do')?.addEventListener('click', () => {
    const query    = document.getElementById('search-input').value.trim();
    const rootPath = window._rootPath || null;
    if (!query) return;
    const results = searchInFiles(rootPath, query);
    renderResults(results, query);
  });

  document.getElementById('btn-replace-do')?.addEventListener('click', () => {
    if (window.Editor) {
      const searchVal  = document.getElementById('search-input').value;
      const replaceVal = document.getElementById('replace-input').value;
      if (!searchVal) return;
      const content = window.Editor.getEditorContent();
      const newContent = content.split(searchVal).join(replaceVal);
      if (monacoEditor) {
        const model = monacoEditor.getModel();
        if (model) model.setValue(newContent);
      }
    }
  });

  // Editor find shortcut forwarding
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'f') {
      if (monacoEditor && document.getElementById('monaco-editor').style.display !== 'none') {
        monacoEditor.focus();
        monacoEditor.trigger('keyboard', 'actions.find', null);
        e.preventDefault();
      }
    }
    if (e.ctrlKey && e.key === 'h') {
      if (monacoEditor) {
        monacoEditor.focus();
        monacoEditor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
        e.preventDefault();
      }
    }
  });

  window.Search = { searchInFiles, renderResults };
})();
