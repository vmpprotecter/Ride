// =============================================
// Ride — File Tree / Sidebar
// =============================================
(function () {
  const { ipcRenderer } = require('electron');
  const nodePath = require('path');
  const fs = require('fs');
  let rootPath   = null;
  let expanded   = new Set();
  let activeFile = null;

  const treeEl   = document.getElementById('file-tree');
  const noFolder = document.getElementById('no-folder-msg');
  const headerName = document.getElementById('sidebar-folder-name');

  const FILE_ICONS = {
    js: '🟨', mjs: '🟨', ts: '🔷', tsx: '🔷', jsx: '🟨',
    py: '🐍', pyw: '🐍', c: '🔵', h: '🔵', cpp: '🟣', cc: '🟣', hpp: '🟣',
    rs: '🦀', go: '🐹', java: '☕', kt: '🎯', rb: '💎', php: '🐘',
    sh: '🐚', bash: '🐚', zsh: '🐚', fish: '🐚',
    json: '{}', yaml: '📋', yml: '📋', toml: '📋',
    html: '🌐', htm: '🌐', css: '🎨', scss: '🎨', sass: '🎨', less: '🎨',
    md: '📝', mdx: '📝', txt: '📄', log: '📄', svg: '🖼',
    png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', webp: '🖼',
    pdf: '📕', zip: '📦', tar: '📦', gz: '📦',
    dockerfile: '🐳', makefile: '⚙',
    sql: '🗄', lua: '🌙',
  };

  function fileIcon(name, isDir) {
    if (isDir) return '📁';
    const ext  = name.toLowerCase().split('.').pop();
    const base = name.toLowerCase();
    if (base === 'dockerfile') return '🐳';
    if (base === 'makefile')   return '⚙';
    return FILE_ICONS[ext] || '📄';
  }

  async function renderDir(dirPath, parentEl, depth) {
    const res = await ipcRenderer.invoke('fs:readDir', dirPath);
    if (!res.ok) return;
    res.entries.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'tree-row';
      row.dataset.path  = entry.path;
      row.dataset.isDir = entry.isDir;

      const indent = document.createElement('span');
      indent.className = 'tree-indent';
      indent.style.width = (depth * 16) + 'px';

      const arrow = document.createElement('span');
      arrow.className = 'tree-arrow';
      arrow.textContent = entry.isDir ? '▶' : '';

      const icon = document.createElement('span');
      icon.className = 'tree-icon';
      icon.textContent = fileIcon(entry.name, entry.isDir);

      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = entry.name;

      row.appendChild(indent);
      row.appendChild(arrow);
      row.appendChild(icon);
      row.appendChild(label);
      parentEl.appendChild(row);

      if (entry.isDir) {
        const children = document.createElement('div');
        children.className = 'tree-children';
        children.dataset.dir = entry.path;
        parentEl.appendChild(children);

        if (expanded.has(entry.path)) {
          children.classList.add('open');
          arrow.style.transform = 'rotate(90deg)';
          renderDir(entry.path, children, depth + 1);
        }

        row.addEventListener('click', async () => {
          document.querySelectorAll('.tree-row').forEach(r => r.classList.remove('active'));
          row.classList.add('active');
          if (children.classList.contains('open')) {
            children.classList.remove('open');
            arrow.style.transform = 'rotate(0deg)';
            icon.textContent = '📁';
            expanded.delete(entry.path);
          } else {
            children.classList.add('open');
            arrow.style.transform = 'rotate(90deg)';
            icon.textContent = '📂';
            expanded.add(entry.path);
            if (children.children.length === 0) {
              await renderDir(entry.path, children, depth + 1);
            }
          }
        });
      } else {
        row.addEventListener('click', () => {
          document.querySelectorAll('.tree-row').forEach(r => r.classList.remove('active'));
          row.classList.add('active');
          activeFile = entry.path;
          openFile(entry.path, entry.name);
        });
        row.addEventListener('contextmenu', e => {
          e.preventDefault();
          showContextMenu(e.clientX, e.clientY, entry);
        });
      }
    });
  }

  async function openFile(filePath, name) {
    const res = await ipcRenderer.invoke('fs:readFile', filePath);
    if (!res.ok) { console.error(res.error); return; }
    const icon = fileIcon(name, false);
    const lang = window.Editor ? window.Editor.getLang(filePath) : 'plaintext';
    window.Tabs.openTab({ name, path: filePath, content: res.content, icon });
    window.Tabs.markModified(window.Tabs.activeTab()?.id, false);
  }

  function setRoot(dirPath) {
    rootPath = dirPath;
    window._rootPath = dirPath;
    treeEl.innerHTML = '';
    noFolder.style.display = 'none';
    treeEl.style.display   = 'block';
    headerName.textContent = nodePath.basename(dirPath).toUpperCase();
    renderDir(dirPath, treeEl, 0);
    expanded.clear();
  }

  // Activity bar switching
  document.querySelectorAll('.ab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panel = btn.dataset.panel;
      document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('panel-' + panel);
      if (target) target.classList.add('active');
    });
  });

  // Open folder buttons
  async function doOpenFolder() {
    const dir = await ipcRenderer.invoke('fs:openFolderDialog');
    if (dir) {
      window._rootPath = dir;
      setRoot(dir);
    }
  }
  document.getElementById('btn-open-folder')?.addEventListener('click', doOpenFolder);
  document.getElementById('btn-open-folder2')?.addEventListener('click', doOpenFolder);

  // New file button
  document.getElementById('btn-new-file')?.addEventListener('click', () => {
    if (window.handleMenuAction) window.handleMenuAction('new-file');
    else window.Tabs.openTab({ name: 'untitled', content: '', icon: '📄' });
  });

  // Collapse all
  document.getElementById('btn-collapse-all')?.addEventListener('click', () => {
    document.querySelectorAll('.tree-children').forEach(c => c.classList.remove('open'));
    document.querySelectorAll('.tree-arrow').forEach(a => a.style.transform = 'rotate(0deg)');
    expanded.clear();
  });

  // Context menu
  const ctxMenu = document.getElementById('context-menu');
  let ctxEntry  = null;

  function showContextMenu(x, y, entry) {
    ctxEntry = entry;
    ctxMenu.style.left = x + 'px';
    ctxMenu.style.top  = y + 'px';
    ctxMenu.classList.add('visible');
  }

  ctxMenu.querySelectorAll('.ctx-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      if (!ctxEntry) return;
      if (action === 'ctx-open')      openFile(ctxEntry.path, ctxEntry.name);
      if (action === 'ctx-copy-path') navigator.clipboard.writeText(ctxEntry.path);
      if (action === 'ctx-rename') {
        const newName = prompt('Rename:', ctxEntry.name);
        if (newName) {
          const newPath = nodePath.join(nodePath.dirname(ctxEntry.path), newName);
          require('fs').renameSync(ctxEntry.path, newPath);
          if (rootPath) setRoot(rootPath);
        }
      }
      if (action === 'ctx-delete') {
        if (confirm(`Delete ${ctxEntry.name}?`)) {
          require('fs').unlinkSync(ctxEntry.path);
          if (rootPath) setRoot(rootPath);
        }
      }
      ctxMenu.classList.remove('visible');
    });
  });

  document.addEventListener('click', () => ctxMenu.classList.remove('visible'));

  // IPC from main
  ipcRenderer.on('folder:opened', (_, dir) => {
    window._rootPath = dir;
    setRoot(dir);
  });
  ipcRenderer.on('file:opened', (_, { path: fp, content }) => {
    window.Tabs.openTab({ name: nodePath.basename(fp), path: fp, content, icon: '📄' });
  });

  // sidebar resize
  const resizeHandle = document.getElementById('sidebar-resize');
  const sidebar      = document.getElementById('sidebar');
  let   isResizing   = false;
  resizeHandle.addEventListener('mousedown', e => { isResizing = true; e.preventDefault(); });
  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    const w = e.clientX - document.getElementById('activity-bar').offsetWidth;
    if (w > 100 && w < 600) {
      sidebar.style.width = w + 'px';
      document.documentElement.style.setProperty('--sidebar-w', w + 'px');
    }
  });
  document.addEventListener('mouseup', () => { isResizing = false; });

  window.Sidebar = { setRoot, openFile };
})();
