# Ride IDE — Official Documentation

> A fast, minimal, open-source code editor for Linux.  
> Built with Electron + Monaco Editor (the same engine that powers VS Code).

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Source Code Guide](#source-code-guide)
  - [main.js](#mainjs)
  - [index.html](#indexhtml)
  - [js/editor.js](#jseditorjs)
  - [js/tabs.js](#jstabsjs)
  - [js/sidebar.js](#jssidebarjs)
  - [js/terminal.js](#jsterminaljs)
  - [js/search.js](#jssearchjs)
  - [js/statusbar.js](#jsstatusbarjs)
  - [js/app.js](#jsappjs)
  - [css/theme.css](#cssthemecss)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Supported Languages](#supported-languages)
- [Building for Distribution](#building-for-distribution)
- [Contributing](#contributing)

---

## Overview

**Ride** (R IDE) is a lightweight desktop code editor designed exclusively for Linux.  
It aims to be fast, clean and developer-friendly — no bloat, no telemetry, no cloud.

The name comes from **R**everse OS **IDE** — it was originally built as the default editor
for the [Reverse OS](../reverse-os) Linux distribution focused on reverse engineering.

---

## Features

- Monaco Editor — full VS Code editing engine
- Syntax highlighting for 40+ languages
- File tree explorer with expand/collapse
- Multi-tab editing with unsaved change indicators
- Built-in terminal (bash/zsh/fish via node-pty)
- Search across all files in a folder
- Custom dark theme (Ride Dark) with red accent
- Statusbar: language, cursor position, encoding, EOL
- Settings panel: font size, tab size, minimap, word wrap
- Keyboard shortcuts matching VS Code conventions
- Resizable sidebar and terminal panel

---

## Installation

```bash
# Clone or download the project
cd ride

# Install dependencies
npm install

# Run
npm start
```

**Requirements:**
- Node.js 18+
- npm 9+
- Linux (x11 or Wayland)

---

## Project Structure

```
ride/
├── main.js              — Electron main process
├── index.html           — App layout (HTML skeleton)
├── package.json         — Dependencies and build config
├── launch.sh            — Quick launcher script
├── vendor/              — Bundled Monaco + xterm (copied from node_modules)
│   ├── vs/              — Monaco Editor files
│   └── xterm/           — xterm.js + addon-fit
├── css/
│   └── theme.css        — All UI styles
├── js/
│   ├── app.js           — Main controller (menu, shortcuts, save/open)
│   ├── editor.js        — Monaco Editor setup and API
│   ├── tabs.js          — Tab bar management
│   ├── sidebar.js       — File explorer tree
│   ├── terminal.js      — Built-in terminal
│   ├── search.js        — Search in files
│   └── statusbar.js     — Bottom status bar
└── assets/
    └── icon.png         — App icon
```

---

## Source Code Guide

> **Note:** All source files are intentionally commented with `//` markers.  
> This makes it easy to navigate the codebase, understand what each section does,
> and contribute without reading the entire file.  
> Every `// ----` block marks a logical section of the code.

---

### main.js

The **Electron main process**. Runs in Node.js, not in the browser.  
Responsible for:

```
// Creates the BrowserWindow (the actual app window)
// Registers the native OS menu (File, Edit, View, Terminal, Help)
// Handles all IPC (Inter-Process Communication) between UI and Node.js
// File system operations: readFile, writeFile, readDir, dialogs
// Sends menu events to renderer via ipcMain/ipcRenderer
```

Key IPC channels:

| Channel | Direction | Description |
|---------|-----------|-------------|
| `fs:readFile` | renderer → main | Read a file from disk |
| `fs:writeFile` | renderer → main | Write/save a file |
| `fs:readDir` | renderer → main | List directory contents |
| `fs:openDialog` | renderer → main | Show open file dialog |
| `fs:openFolderDialog` | renderer → main | Show open folder dialog |
| `fs:saveDialog` | renderer → main | Show save dialog |
| `menu:save` | main → renderer | Ctrl+S pressed |
| `menu:new-file` | main → renderer | Ctrl+N pressed |

---

### index.html

The **UI skeleton**. Contains all HTML elements but no logic.  
Structure:

```
// #titlebar        — top bar with logo and window title
// #menubar         — File / Edit / View / Terminal / Help dropdowns
// #workbench       — main area (everything below menubar)
//   #activity-bar  — left icon strip (Explorer, Search, Git, Settings)
//   #sidebar       — file tree / search / settings panels
//   #main-panel    — tabs + editor + bottom panel
//     #tabs-bar    — open file tabs
//     #editor-container — Monaco editor + welcome screen
//     #bottom-panel     — terminal / problems / output
// #statusbar       — bottom info bar
// #context-menu    — right-click menu for file tree
```

Scripts are loaded in this order (important — dependencies first):
```html
tabs.js → sidebar.js → terminal.js → editor.js → statusbar.js → search.js → app.js
```

---

### js/editor.js

The **Monaco Editor** module. The heart of Ride.

```
// LANG_MAP        — maps file extensions to Monaco language IDs
//                   e.g. { py: 'python', rs: 'rust', cpp: 'cpp' }

// LANG_ICONS      — maps language IDs to emoji icons for tabs
//                   e.g. { python: '🐍', rust: '🦀' }

// getLang()       — returns Monaco language for a given file path
// getLangIcon()   — returns emoji icon for a language

// Monaco loader   — dynamically loads Monaco from vendor/vs/loader.js
//                   uses relative path so it works in Electron

// ride-dark theme — custom Monaco color theme
//                   black background, red keywords, green strings

// initMonaco()    — creates the Monaco editor instance with all options
//                   called once on app start from app.js
//                   fires 'monaco:ready' event when done

// openInEditor()  — opens a file in the editor
//                   creates or reuses Monaco model for the file URI
//                   hides welcome screen, shows editor

// getEditorContent() — returns current editor text (used for save)

// applySettings() — updates editor options at runtime
//                   font size, word wrap, tab size, minimap, line numbers
```

---

### js/tabs.js

Manages the **tab bar** at the top of the editor area.

```
// tabs[]          — array of open tab objects
//                   each tab: { id, name, path, content, icon, modified }

// render()        — redraws all tabs in the DOM

// openTab()       — opens a new tab or activates existing one (by path)
//                   prevents duplicate tabs for the same file

// activateTab()   — switches to a tab, loads file into Monaco
//                   waits for 'monaco:ready' if editor not loaded yet

// closeTab()      — closes a tab, switches to nearest tab
//                   shows welcome screen if no tabs remain

// markModified()  — adds ● dot to tab label when file has unsaved changes

// updateContent() — syncs in-memory content before save

// activeTab()     — returns currently active tab object
```

---

### js/sidebar.js

The **file explorer** panel on the left.

```
// rootPath        — currently open folder path
// expanded        — Set of expanded directory paths (persists during session)

// FILE_ICONS      — maps extensions to emoji icons for the tree

// fileIcon()      — returns emoji for a file or folder

// renderDir()     — recursively renders a directory into the tree DOM
//                   folders are clickable to expand/collapse
//                   files open in editor on click

// openFile()      — reads file from disk and calls Tabs.openTab()

// setRoot()       — sets a new root folder and re-renders the tree
//                   called when user opens a folder

// doOpenFolder()  — shows folder picker dialog, then calls setRoot()

// Activity bar    — switches between Explorer / Search / Git / Settings panels

// sidebar resize  — drag handle between sidebar and editor
//                   mousedown → mousemove → mouseup pattern

// Context menu    — right-click on file: Open, Rename, Copy Path, Delete
```

---

### js/terminal.js

The **built-in terminal** at the bottom of the screen.

```
// loadXterm()     — dynamically loads xterm.js and addon-fit from vendor/
//                   injects <script> and <link> tags into <head>

// initTerminal()  — creates xterm.js Terminal instance with Ride Dark colors
//                   spawns a real shell (bash/zsh) via node-pty
//                   connects terminal I/O to the pty process
//                   sets up ResizeObserver to auto-fit terminal

// clearTerminal() — clears the terminal screen

// showTerminal()  — makes bottom panel visible, inits terminal if first time

// hideTerminal()  — hides the bottom panel

// toggleTerminal()— show/hide toggle (used by Ctrl+`)

// Panel tabs      — TERMINAL / PROBLEMS / OUTPUT tab switching

// Panel resize    — drag handle above the terminal panel
//                   adjusts panel height dynamically
```

---

### js/search.js

**Search across all files** in the open folder.

```
// searchInFiles() — walks the directory tree recursively
//                   skips node_modules, .git, dist, build
//                   returns list of { file, name, matches[] }
//                   each match: { line number, line text }

// renderResults() — renders search results in the sidebar
//                   highlights matched text with <mark>
//                   click on result → opens file and jumps to line

// search-input    — live search with 300ms debounce as you type

// btn-search-do   — manual search button

// btn-replace-do  — simple text replace in current editor content
//                   replaces all occurrences in the active file

// Ctrl+F / Ctrl+H — forwards to Monaco's built-in find/replace widget
```

---

### js/statusbar.js

The **bottom status bar** (red bar at the very bottom).

```
// sb-lang         — shows current file language
//                   click to cycle through languages
//                   also changes Monaco syntax highlighting

// sb-spaces       — shows current tab size
//                   click to cycle: 2 → 4 → 8

// sb-eol          — shows line ending: LF or CRLF
//                   click to toggle

// sb-cursor       — updated by Monaco's onDidChangeCursorPosition
//                   shows "Ln X, Col Y"

// sb-errors       — shows error/warning count (placeholder)

// Statusbar.setLang()   — programmatic language change
// Statusbar.setErrors() — programmatic error count update
```

---

### js/app.js

The **main controller** — connects everything together.

```
// initMonaco()    — starts Monaco loading on app start
//                   when ready, opens any pending active tab

// Menu bar        — wires HTML dropdown menus to handleMenuAction()
//                   closes dropdowns on outside click

// handleMenuAction() — central dispatcher for all menu/keyboard actions
//                      new-file, open-file, open-folder, save, save-as,
//                      close-tab, find, replace, format, toggle-sidebar,
//                      toggle-terminal, zoom-in, zoom-out, about

// saveCurrentFile()  — saves active tab to disk
//                      calls saveAs() if file has no path yet

// saveAs()           — shows save dialog, writes file, updates tab

// Keyboard shortcuts — Ctrl+S, Ctrl+N, Ctrl+W, Ctrl+B, Ctrl+`, Ctrl+O

// Welcome buttons    — Open File / Open Folder / New File on start screen

// IPC listeners      — receives menu events from main process
//                      (native OS menu → ipcRenderer.on → handleMenuAction)

// Settings panel     — font size, word wrap, tab size, minimap, line numbers
//                      changes applied instantly via Editor.applySettings()
```

---

### css/theme.css

All UI styles in one file. Uses CSS custom properties (variables).

```
// :root            — all color/size variables
//                    --red, --bg, --border, --text, --font-mono etc.

// Titlebar         — top bar, -webkit-app-region: drag

// Menubar          — File/Edit/View dropdowns

// Workbench        — flex layout for the main area

// Activity bar     — left icon strip with active indicator line

// Sidebar          — file tree panel, resize handle

// File tree        — .tree-row, .tree-arrow, .tree-children

// Tabs             — .tab, .tab.active, .tab.modified

// Welcome screen   — centered logo shown when no files are open

// Editor container — positions Monaco and welcome screen as layers

// Bottom panel     — terminal/problems/output with resize handle

// Statusbar        — red background, white text

// Context menu     — floating right-click menu

// Search results   — .sr-file, .sr-match with <mark> highlights

// Settings panel   — form inputs for editor preferences
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New file |
| `Ctrl+O` | Open file |
| `Ctrl+Shift+O` | Open folder |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+W` | Close tab |
| `Ctrl+F` | Find in file |
| `Ctrl+H` | Find and replace |
| `Ctrl+/` | Toggle line comment |
| `Ctrl+B` | Toggle sidebar |
| Ctrl+\` | Toggle terminal |
| `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `F11` | Full screen |
| `F12` | DevTools |

---

## Supported Languages

Ride supports syntax highlighting for all languages built into Monaco Editor:

| Language | Extensions |
|----------|-----------|
| Python | `.py` `.pyw` |
| JavaScript | `.js` `.mjs` `.jsx` |
| TypeScript | `.ts` `.tsx` |
| C | `.c` `.h` |
| C++ | `.cpp` `.cc` `.cxx` `.hpp` |
| Rust | `.rs` |
| Go | `.go` |
| Java | `.java` |
| Kotlin | `.kt` |
| C# | `.cs` |
| Shell | `.sh` `.bash` `.zsh` `.fish` |
| HTML | `.html` `.htm` |
| CSS / SCSS | `.css` `.scss` `.sass` `.less` |
| JSON | `.json` `.jsonc` |
| YAML | `.yaml` `.yml` |
| TOML | `.toml` |
| Markdown | `.md` `.mdx` |
| SQL | `.sql` |
| Lua | `.lua` |
| Ruby | `.rb` |
| PHP | `.php` |
| Dockerfile | `Dockerfile` |
| Makefile | `Makefile` |
| Assembly | `.asm` `.s` |
| XML / SVG | `.xml` `.svg` |
| + 15 more | via Monaco built-ins |

---

## Building for Distribution

```bash
# Build AppImage (recommended)
npm run build:appimage

# Build .deb package
npm run build:deb

# Build both
npm run build
```

Output will be in the `dist/` folder.

---

## Contributing

The source code is intentionally kept simple and well-commented.  
Every `//` comment in the source marks a logical section — this makes it easy
to find what you need without an IDE or documentation.

**To add a new feature:**
1. Find the relevant file (see Source Code Guide above)
2. Look for the `// ----` section comment nearest to where your feature belongs
3. Add your code, add a `//` comment explaining what it does
4. Test with `npm start`

**File a bug or suggestion** — open an issue on GitHub.

---

## License

MIT — free to use, modify and distribute.

---

*Built with ❤ as part of the Reverse OS Project — 2026*
