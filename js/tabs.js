// =============================================
// Ride — Tabs Manager
// =============================================
(function () {
  const tabsList = document.getElementById('tabs-list');
  let tabs = [];
  let activeId = null;
  let nextId = 1;

  function render() {
    tabsList.innerHTML = '';
    tabs.forEach(tab => {
      const el = document.createElement('div');
      el.className = 'tab' + (tab.id === activeId ? ' active' : '') + (tab.modified ? ' modified' : '');
      el.dataset.id = tab.id;
      el.innerHTML = `<span class="tab-icon">${tab.icon || '📄'}</span><span class="tab-label" title="${tab.path || tab.name}">${tab.name}</span><span class="tab-close" data-close="${tab.id}">✕</span>`;
      el.addEventListener('click', e => {
        if (e.target.dataset.close) { closeTab(+e.target.dataset.close); return; }
        activateTab(tab.id);
      });
      el.addEventListener('mousedown', e => { if (e.button === 1) closeTab(tab.id); });
      tabsList.appendChild(el);
    });
  }

  function openTab({ name, path, content, icon }) {
    // check if already open
    const existing = tabs.find(t => t.path === path);
    if (existing && path) { activateTab(existing.id); return existing; }
    const id = nextId++;
    const tab = { id, name, path: path || null, content: content || '', icon: icon || '📄', modified: false };
    tabs.push(tab);
    activateTab(id);
    return tab;
  }

  function activateTab(id) {
    activeId = id;
    render();
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;

    function doOpen() {
      const info = window.Editor.openInEditor(tab.path || tab.name, tab.content || '');
      if (info) { tab.icon = info.icon; render(); }
    }

    if (window.monacoEditor) {
      doOpen();
    } else {
      // wait for monaco to be ready
      window.addEventListener('monaco:ready', doOpen, { once: true });
    }

    document.title = `${tab.name} — Ride`;
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    tabs.splice(idx, 1);
    if (activeId === id) {
      if (tabs.length === 0) {
        activeId = null;
        document.getElementById('welcome-screen').style.display = 'flex';
        document.getElementById('monaco-editor').style.display  = 'none';
        document.title = 'Ride';
      } else {
        activateTab(tabs[Math.min(idx, tabs.length - 1)].id);
      }
    }
    render();
  }

  function markModified(id, val) {
    const tab = tabs.find(t => t.id === id);
    if (tab) { tab.modified = val; render(); }
  }

  function updateContent(id, content) {
    const tab = tabs.find(t => t.id === id);
    if (tab) tab.content = content;
  }

  function activeTab() { return tabs.find(t => t.id === activeId) || null; }

  window.Tabs = { openTab, activateTab, closeTab, markModified, updateContent, activeTab, getTabs: () => tabs };
})();
