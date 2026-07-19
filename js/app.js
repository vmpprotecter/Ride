// =============================================
// Ride — Main App Controller
// =============================================
(function() {
const { ipcRenderer } = require('electron');
const nodePath        = require('path');
const fs              = require('fs');

// Init Monaco then wire everything up
window.Editor.initMonaco(() => {
  // Monaco ready — if there are pending tabs, open the active one
  const active = window.Tabs.activeTab();
  if (active) {
    window.Editor.openInEditor(active.path || active.name, active.content || '');
  }
});

// ---- MENU BAR (custom HTML dropdowns) ----
document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', e => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
    e.stopPropagation();
  });
});
document.addEventListener('click', () => {
  document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('open'));
});
document.querySelectorAll('.dd-item').forEach(item => {
  item.addEventListener('click', e => {
    handleMenuAction(item.dataset.action);
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('open'));
    e.stopPropagation();
  });
});

async function handleMenuAction(action) {
  window.handleMenuAction = handleMenuAction; // expose globally
  switch (action) {
    case 'new-file': {
      const rootPath = window._rootPath;
      if (rootPath) {
        const name = prompt('File name:', 'untitled.py');
        if (!name) break;
        const fullPath = nodePath.join(rootPath, name);
        // create file on disk if it doesn't exist
        if (!fs.existsSync(fullPath)) fs.writeFileSync(fullPath, '', 'utf8');
        const icon = window.Editor.getLangIcon(window.Editor.getLang(fullPath));
        window.Tabs.openTab({ name, path: fullPath, content: '', icon });
        window.Tabs.markModified(window.Tabs.activeTab()?.id, false);
        // refresh sidebar
        window.Sidebar.setRoot(rootPath);
      } else {
        window.Tabs.openTab({ name: 'untitled', content: '', icon: '📄' });
      }
      break;
    }

    case 'open-file': {
      const res = await ipcRenderer.invoke('fs:openDialog');
      if (res) {
        const name = nodePath.basename(res.path);
        const icon = window.Editor.getLangIcon(window.Editor.getLang(res.path));
        window.Tabs.openTab({ name, path: res.path, content: res.content, icon });
        window.Tabs.markModified(window.Tabs.activeTab()?.id, false);
      }
      break;
    }

    case 'open-folder': {
      const dir = await ipcRenderer.invoke('fs:openFolderDialog');
      if (dir) {
        window._rootPath = dir;
        window.Sidebar.setRoot(dir);
      }
      break;
    }

    case 'save': await saveCurrentFile(); break;
    case 'save-as': await saveAs(); break;
    case 'close-tab': {
      const t = window.Tabs.activeTab();
      if (t) window.Tabs.closeTab(t.id);
      break;
    }

    case 'find':
      if (window.monacoEditor) {
        window.monacoEditor.focus();
        window.monacoEditor.trigger('keyboard', 'actions.find', null);
      }
      break;

    case 'replace':
      if (window.monacoEditor) {
        window.monacoEditor.focus();
        window.monacoEditor.trigger('keyboard', 'editor.action.startFindReplaceAction', null);
      }
      break;

    case 'format':
      if (window.monacoEditor) window.monacoEditor.trigger('keyboard', 'editor.action.formatDocument', null);
      break;

    case 'comment':
      if (window.monacoEditor) window.monacoEditor.trigger('keyboard', 'editor.action.commentLine', null);
      break;

    case 'toggle-sidebar': {
      const sb = document.getElementById('sidebar');
      const sr = document.getElementById('sidebar-resize');
      const hidden = sb.style.display === 'none';
      sb.style.display = hidden ? '' : 'none';
      sr.style.display = hidden ? '' : 'none';
      break;
    }

    case 'toggle-terminal':
      window.Terminal2?.toggleTerminal();
      break;

    case 'new-terminal':
      window.Terminal2?.showTerminal();
      break;

    case 'clear-terminal':
      window.Terminal2?.clearTerminal();
      break;

    case 'zoom-in':
      if (window.monacoEditor) {
        const cur = window.monacoEditor.getOption(monaco.editor.EditorOption.fontSize);
        window.Editor.applySettings({ fontSize: Math.min(cur + 1, 32) });
      }
      break;

    case 'zoom-out':
      if (window.monacoEditor) {
        const cur = window.monacoEditor.getOption(monaco.editor.EditorOption.fontSize);
        window.Editor.applySettings({ fontSize: Math.max(cur - 1, 8) });
      }
      break;

    case 'about':
      alert('Ride v1.0.0\nA fast code editor for Linux.\nBuilt with Electron + Monaco Editor.\n\n© 2026 Reverse OS Project');
      break;
  }
}

// ---- SAVE ----
async function saveCurrentFile() {
  const tab = window.Tabs.activeTab();
  if (!tab) return;
  const content = window.Editor.getEditorContent();
  window.Tabs.updateContent(tab.id, content);

  if (tab.path) {
    const res = await ipcRenderer.invoke('fs:writeFile', tab.path, content);
    if (res.ok) window.Tabs.markModified(tab.id, false);
  } else {
    await saveAs();
  }
}

async function saveAs() {
  const tab = window.Tabs.activeTab();
  if (!tab) return;
  const content  = window.Editor.getEditorContent();
  const savePath = await ipcRenderer.invoke('fs:saveDialog', tab.name);
  if (!savePath) return;
  const res = await ipcRenderer.invoke('fs:writeFile', savePath, content);
  if (res.ok) {
    tab.path = savePath;
    tab.name = nodePath.basename(savePath);
    window.Tabs.markModified(tab.id, false);
  }
}

// ---- KEYBOARD SHORTCUTS ----
document.addEventListener('keydown', e => {
  if (e.ctrlKey) {
    if (e.key === 's') { e.preventDefault(); e.shiftKey ? saveAs() : saveCurrentFile(); }
    if (e.key === 'n') { e.preventDefault(); window.Tabs.openTab({ name: 'untitled', content: '', icon: '📄' }); }
    if (e.key === 'w') { e.preventDefault(); const t = window.Tabs.activeTab(); if (t) window.Tabs.closeTab(t.id); }
    if (e.key === 'b') { e.preventDefault(); handleMenuAction('toggle-sidebar'); }
    if (e.key === '`') { e.preventDefault(); window.Terminal2?.toggleTerminal(); }
    if (e.key === 'o') { e.preventDefault(); e.shiftKey ? handleMenuAction('open-folder') : handleMenuAction('open-file'); }
  }
});

// ---- WELCOME BUTTONS ----
document.getElementById('wb-open-file')?.addEventListener('click', () => handleMenuAction('open-file'));
document.getElementById('wb-open-folder')?.addEventListener('click', () => handleMenuAction('open-folder'));
document.getElementById('wb-new-file')?.addEventListener('click', () => handleMenuAction('new-file'));

// ---- IPC from main menu ----
ipcRenderer.on('menu:new-file',       () => handleMenuAction('new-file'));
ipcRenderer.on('menu:save',           () => saveCurrentFile());
ipcRenderer.on('menu:save-as',        () => saveAs());
ipcRenderer.on('menu:close-tab',      () => handleMenuAction('close-tab'));
ipcRenderer.on('menu:find',           () => handleMenuAction('find'));
ipcRenderer.on('menu:replace',        () => handleMenuAction('replace'));
ipcRenderer.on('menu:toggle-sidebar', () => handleMenuAction('toggle-sidebar'));
ipcRenderer.on('menu:toggle-terminal',() => window.Terminal2?.toggleTerminal());
ipcRenderer.on('menu:new-terminal',   () => window.Terminal2?.showTerminal());
ipcRenderer.on('menu:clear-terminal', () => window.Terminal2?.clearTerminal());
ipcRenderer.on('menu:zoom-in',        () => handleMenuAction('zoom-in'));
ipcRenderer.on('menu:zoom-out',       () => handleMenuAction('zoom-out'));

// ---- SETTINGS panel ----
document.getElementById('set-font-size')?.addEventListener('change', e => {
  window.Editor.applySettings({ fontSize: +e.target.value });
});
document.getElementById('set-word-wrap')?.addEventListener('change', e => {
  window.Editor.applySettings({ wordWrap: e.target.value });
});
document.getElementById('set-tab-size')?.addEventListener('change', e => {
  window.Editor.applySettings({ tabSize: +e.target.value });
  document.getElementById('sb-spaces').textContent = `Spaces: ${e.target.value}`;
});
document.getElementById('set-minimap')?.addEventListener('change', e => {
  window.Editor.applySettings({ minimap: e.target.value });
});
document.getElementById('set-line-numbers')?.addEventListener('change', e => {
  window.Editor.applySettings({ lineNumbers: e.target.value });
});

// expose handleMenuAction globally for sidebar.js
window.handleMenuAction = handleMenuAction;

})(); // end IIFE
