const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'AutoSQL - 离线 SQL 代码优化器',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getDataDir() {
  const dir = path.join(app.getPath('userData'), '.auto-sql');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getMetadataDir() {
  const dir = path.join(getDataDir(), 'metadata');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getLogDir() {
  const dir = path.join(getDataDir(), 'logs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function setupIpc() {
  ipcMain.handle('save-file', async (event, { content, defaultPath }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultPath || 'output.sql',
      filters: [
        { name: 'SQL Files', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    }
    return { success: false };
  });

  ipcMain.handle('load-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [
        { name: 'SQL Files', extensions: ['sql'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const content = fs.readFileSync(result.filePaths[0], 'utf-8');
      return { success: true, content, filePath: result.filePaths[0] };
    }
    return { success: false };
  });

  ipcMain.handle('save-metadata', async (event, { tableName, data }) => {
    const metadataDir = getMetadataDir();
    const filePath = path.join(metadataDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  });

  ipcMain.handle('load-metadata', async () => {
    const metadataDir = getMetadataDir();
    const files = fs.readdirSync(metadataDir).filter(f => f.endsWith('.json'));
    const tables = {};
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(metadataDir, file), 'utf-8');
        const data = JSON.parse(content);
        tables[file.replace('.json', '')] = data;
      } catch (e) {
        console.error('Failed to load metadata file:', file, e);
      }
    }
    return { success: true, tables };
  });

  ipcMain.handle('delete-metadata', async (event, { tableName }) => {
    const metadataDir = getMetadataDir();
    const filePath = path.join(metadataDir, `${tableName}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  });

  ipcMain.handle('save-config', async (event, { config }) => {
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  });

  ipcMain.handle('load-config', async () => {
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, 'config.json');
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, config: JSON.parse(content) };
      } catch (e) {
        return { success: false };
      }
    }
    return { success: false };
  });

  ipcMain.handle('get-log-path', async () => {
    return { path: path.join(getLogDir(), 'app.log') };
  });

  ipcMain.handle('open-log-dir', async () => {
    shell.openPath(getLogDir());
    return { success: true };
  });
}

app.whenReady().then(() => {
  setupIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
