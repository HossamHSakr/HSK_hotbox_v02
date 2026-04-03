// Electron main process for Universal Hotbox OS MVP
const { app, BrowserWindow, ipcMain, shell, screen, globalShortcut } = require('electron');
// Force software rendering for Electron GPU compatibility in VM/remote setups
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer', 'false');
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('use-gl', 'swiftshader');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');
app.commandLine.appendSwitch('log-level', '3');
app.commandLine.appendSwitch('no-sandbox');
// Disable hardware acceleration as an additional safeguard
app.disableHardwareAcceleration();
const path = require('path');
const fs = require('fs');
const { exec, execSync, spawn } = require('child_process');
const parseFoldersTxt = require('./core/parseFoldersTxt');

// Ensure only one instance runs at a time
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Use a writable runtime directory to avoid cache permission errors.
const runtimeUserData = path.join(app.getPath('temp'), 'hsk_hotbox_v02_user_data');
app.setPath('userData', runtimeUserData);


let win = null;
let hotboxVisible = false;

function expandWindowsEnv(input) {
  if (!input || typeof input !== 'string') return input;
  return input.replace(/%([^%]+)%/g, (_m, name) => process.env[name] || process.env[name.toUpperCase()] || `%${name}%`);
}

function navigateCurrentWindowToPath(folderPath) {
  return new Promise((resolve) => {
    const escaped = String(folderPath).replace(/'/g, "''");
    const ps = [
      "$ws = New-Object -ComObject WScript.Shell",
      `Set-Clipboard -Value '${escaped}'`,
      'Start-Sleep -Milliseconds 120',
      "$ws.SendKeys('%d')",
      'Start-Sleep -Milliseconds 140',
      "$ws.SendKeys('^v')",
      'Start-Sleep -Milliseconds 80',
      "$ws.SendKeys('{ENTER}')",
      // Fallback sequence for dialogs that do not react to Alt+D
      'Start-Sleep -Milliseconds 120',
      "$ws.SendKeys('^l')",
      'Start-Sleep -Milliseconds 120',
      "$ws.SendKeys('^v')",
      'Start-Sleep -Milliseconds 80',
      "$ws.SendKeys('{ENTER}')",
    ].join('; ');

    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], {
      windowsHide: true,
      stdio: 'ignore',
    });

    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

function showHotboxAtCursor() {
  if (!win) return;
  const point = screen.getCursorScreenPoint();
  const [w, h] = win.getSize();
  win.setPosition(Math.round(point.x - w / 2), Math.round(point.y - h / 2), false);
  hotboxVisible = true;
  win.showInactive();
  win.webContents.send('hotbox-visible', true);
}

function hideHotbox() {
  if (!win) return;
  hotboxVisible = false;
  win.webContents.send('hotbox-visible', false);
  win.hide();
}

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    show: false, // show only when needed
    skipTaskbar: true,
  });
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  // Global hotkey works even when app window is hidden/unfocused.
  globalShortcut.register('Shift+Space', () => {
    if (hotboxVisible) hideHotbox();
    else showHotboxAtCursor();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// IPC: Move window to mouse position and show/hide
ipcMain.on('hotbox-show', (event, mouseX, mouseY) => {
  if (!win) return;
  // Center window at mouse
  const [w, h] = win.getSize();
  win.setPosition(Math.round(mouseX - w / 2), Math.round(mouseY - h / 2), false);
  win.show();
  hotboxVisible = true;
  win.webContents.send('hotbox-visible', true);
});
ipcMain.on('hotbox-hide', () => {
  hideHotbox();
});

ipcMain.handle('hotbox-get-config', async () => {
  try {
    const jsonPath = path.join(__dirname, 'config', 'hotbox.json');
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    const foldersPath = path.join(__dirname, 'config', 'folders.txt');
    return { menus: parseFoldersTxt(foldersPath) };
  } catch (e) {
    return require('./config/hotbox.json');
  }
});

ipcMain.handle('hotbox-save-config', async (_event, config) => {
  try {
    const jsonPath = path.join(__dirname, 'config', 'hotbox.json');
    fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('hotbox-get-ui-style', async () => {
  try {
    const jsonPath = path.join(__dirname, 'config', 'ui-style.json');
    if (fs.existsSync(jsonPath)) {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    }
    return require('./config/ui-style.json');
  } catch (e) {
    return require('./config/ui-style.json');
  }
});

ipcMain.handle('hotbox-save-ui-style', async (_event, uiStyle) => {
  try {
    const jsonPath = path.join(__dirname, 'config', 'ui-style.json');
    fs.writeFileSync(jsonPath, JSON.stringify(uiStyle, null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Command execution handler
ipcMain.handle('hotbox-exec', async (event, action, target, options = {}) => {
  try {
    const resolvedTarget = expandWindowsEnv(target);
    if (action === 'launch_app') {
      spawn(resolvedTarget, [], { detached: true, stdio: 'ignore' }).unref();
      return 'App launched';
    } else if (action === 'run_script') {
      exec(`"${resolvedTarget}"`, (err, stdout, stderr) => {});
      return 'Script executed';
    } else if (action === 'open_folder') {
      // Non-click selection: navigate currently focused Explorer/Open/Save window when possible.
      if (options.preferCurrentWindow) {
        const navigated = await navigateCurrentWindowToPath(resolvedTarget);
        if (navigated) return 'Current window navigated';
      }
      // Click-triggered folder selection: open in a new Explorer window.
      if (options.forceNewWindow) {
        spawn('explorer.exe', [resolvedTarget], { detached: true, stdio: 'ignore' }).unref();
        return 'Explorer opened';
      }
      shell.openPath(resolvedTarget);
      return 'Folder opened';
    } else if (action === 'send_shortcut') {
      // MVP: Not implemented, would require robotjs or similar
      return 'Shortcut sent (not implemented)';
    }
    return 'Unknown action';
  } catch (e) {
    return 'Error: ' + e.message;
  }
});
