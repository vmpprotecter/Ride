// =============================================
// Ride — Status Bar
// =============================================
(function () {
  // Language click → change language
  document.getElementById('sb-lang')?.addEventListener('click', () => {
    const langs = ['plaintext','python','javascript','typescript','c','cpp','rust','go','java',
                   'shell','json','yaml','html','css','markdown','sql','lua'];
    const cur = document.getElementById('sb-lang').textContent;
    const idx = langs.findIndex(l => l === cur.toLowerCase());
    const next = langs[(idx + 1) % langs.length];
    document.getElementById('sb-lang').textContent = next.charAt(0).toUpperCase() + next.slice(1);
    if (window.monacoEditor) {
      const model = window.monacoEditor.getModel();
      if (model) monaco.editor.setModelLanguage(model, next);
    }
  });

  // Spaces click → toggle tab size
  document.getElementById('sb-spaces')?.addEventListener('click', () => {
    const sizes = [2, 4, 8];
    const cur = parseInt(document.getElementById('sb-spaces').textContent.split(': ')[1]) || 4;
    const next = sizes[(sizes.indexOf(cur) + 1) % sizes.length];
    document.getElementById('sb-spaces').textContent = `Spaces: ${next}`;
    window.Editor?.applySettings({ tabSize: next });
  });

  // EOL click
  document.getElementById('sb-eol')?.addEventListener('click', () => {
    const el = document.getElementById('sb-eol');
    el.textContent = el.textContent === 'LF' ? 'CRLF' : 'LF';
  });

  window.Statusbar = {
    setLang(lang) {
      document.getElementById('sb-lang').textContent = lang.charAt(0).toUpperCase() + lang.slice(1);
    },
    setErrors(errors, warnings) {
      document.getElementById('sb-errors').textContent = `✗ ${errors}  ⚠ ${warnings}`;
    }
  };
})();
