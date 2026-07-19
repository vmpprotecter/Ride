const { app, BrowserWindow, Menu, dialog, ipcMain, shell, protocol } = require('electron');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');

let mainWindow;

function createWindow() {
  // Регистрируем протокол для доступа к node_modules
  protocol.registerFileProtocol('ride', (request, callback) => {
    const url = request.url.replace('ride://', '');
    const filePath = path.join(__dirname, url);
    callback({ path: filePath });
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 500,
    frame: true,
    backgroundColor: '#0e0e0e',
    title: 'Ride',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools({ mode: 'detach' });
  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New File',       accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('menu:new-file') },
        { label: 'Open File...', accelerator: 'CmdOrCtrl+O', click: openFile },
        { label: 'Open Folder...', accelerator: 'CmdOrCtrl+Shift+O', click: openFolder },
        { type: 'separator' },
        { label: 'Save',           accelerator: 'CmdOrCtrl+S', click: () => mainWindow.webContents.send('menu:save') },
        { label: 'Save As...',     accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow.webContents.send('menu:save-as') },
        { type: 'separator' },
        { label: 'Close Tab',      accelerator: 'CmdOrCtrl+W', click: () => mainWindow.webContents.send('menu:close-tab') },
        { type: 'separator' },
        { label: 'Quit',           accelerator: 'CmdOrCtrl+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo',           accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo',           accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut',            accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy',           accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste',          accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        { label: 'Find',           accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('menu:find') },
        { label: 'Replace',        accelerator: 'CmdOrCtrl+H', click: () => mainWindow.webContents.send('menu:replace') },
        { type: 'separator' },
        { label: 'Select All',     accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Terminal', accelerator: 'Ctrl+`', click: () => mainWindow.webContents.send('menu:toggle-terminal') },
        { label: 'Toggle Sidebar',  accelerator: 'CmdOrCtrl+B', click: () => mainWindow.webContents.send('menu:toggle-sidebar') },
        { type: 'separator' },
        { label: 'Zoom In',         accelerator: 'CmdOrCtrl+Equal', click: () => mainWindow.webContents.send('menu:zoom-in') },
        { label: 'Zoom Out',        accelerator: 'CmdOrCtrl+Minus', click: () => mainWindow.webContents.send('menu:zoom-out') },
        { label: 'Reset Zoom',      accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.send('menu:zoom-reset') },
        { type: 'separator' },
        { label: 'Full Screen',     accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { label: 'DevTools',        accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Terminal',
      submenu: [
        { label: 'New Terminal',    accelerator: 'CmdOrCtrl+Shift+`', click: () => mainWindow.webContents.send('menu:new-terminal') },
        { label: 'Clear Terminal',  click: () => mainWindow.webContents.send('menu:clear-terminal') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About Ride', click: showAbout },
        { label: 'GitHub', click: () => shell.openExternal('https://github.com/reverse-os/ride') }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function openFile() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Source Code', extensions: ['py','c','cpp','h','rs','js','ts','sh','bash','json','yaml','yml','toml','md','txt','html','css','go','rb','php','java','kt','swift'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const content  = fs.readFileSync(filePath, 'utf8');
    mainWindow.webContents.send('file:opened', { path: filePath, content });
  }
}

async function openFolder() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    mainWindow.webContents.send('folder:opened', result.filePaths[0]);
  }
}

function showAbout() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About Ride',
    message: 'Ride — R IDE',
    detail: 'Version 1.0.0\nA fast, minimal code editor for Linux.\nBuilt with Electron + Monaco Editor.\n\n© 2026 Reverse OS Project'
  });
}

// IPC handlers
ipcMain.handle('fs:readFile', async (_, filePath) => {
  try { return { ok: true, content: fs.readFileSync(filePath, 'utf8') }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
  try { fs.writeFileSync(filePath, content, 'utf8'); return { ok: true }; }
  catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('fs:readDir', async (_, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    return {
      ok: true,
      entries: entries.map(e => ({
        name: e.name,
        isDir: e.isDirectory(),
        path: path.join(dirPath, e.name)
      })).sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
    };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('fs:saveDialog', async (_, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('fs:openDialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const content  = fs.readFileSync(filePath, 'utf8');
  return { path: filePath, content };
});

ipcMain.handle('fs:openFolderDialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('app:getHomeDir', () => os.homedir());
ipcMain.handle('app:pathJoin',   (_, ...args) => path.join(...args));
ipcMain.handle('app:pathBasename', (_, p) => path.basename(p));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
