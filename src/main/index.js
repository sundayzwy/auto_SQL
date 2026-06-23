const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

/** 主窗口实例引用 */
let mainWindow = null;

/** 是否为开发环境 */
const isDev = process.env.NODE_ENV === 'development';

/**
 * 创建主窗口
 *
 * 配置窗口尺寸（1400x900，最小 1000x700）、标题和安全策略。
 * 开发环境加载 Vite 开发服务器地址并打开开发者工具；
 * 生产环境加载打包后的 renderer/index.html。
 * 窗口关闭时清空 mainWindow 引用。
 */
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

/**
 * 获取应用数据目录
 *
 * 路径为 {userData}/.auto-sql，若目录不存在则自动创建。
 * 用于存放配置文件、元数据和日志等持久化数据。
 * @returns {string} 数据目录的绝对路径
 */
function getDataDir() {
  const dir = path.join(app.getPath('userData'), '.auto-sql');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 获取元数据存储目录
 *
 * 路径为 {dataDir}/metadata，用于存放 DDL 解析后的表结构 JSON 文件。
 * @returns {string} 元数据目录的绝对路径
 */
function getMetadataDir() {
  const dir = path.join(getDataDir(), 'metadata');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 获取日志存储目录
 *
 * 路径为 {dataDir}/logs，用于存放应用运行日志。
 * @returns {string} 日志目录的绝对路径
 */
function getLogDir() {
  const dir = path.join(getDataDir(), 'logs');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * 注册所有 IPC 通信处理器
 *
 * 通过 ipcMain.handle 注册渲染进程可调用的主进程方法，包括：
 * - 文件操作：保存/加载 SQL 文件
 * - 元数据操作：保存/加载/删除表元数据
 * - 配置操作：保存/加载用户配置
 * - 日志操作：获取日志路径、打开日志目录
 */
function setupIpc() {
  /**
   * 保存文件
   * 弹出系统保存对话框，将内容写入用户选择的文件路径（默认 .sql 扩展名）。
   * @param {Object} params - { content: string, defaultPath?: string }
   * @returns {Object} { success: boolean, filePath?: string }
   */
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

  /**
   * 加载文件
   * 弹出系统打开对话框，读取用户选择的 SQL 文件内容。
   * @returns {Object} { success: boolean, content?: string, filePath?: string }
   */
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

  /**
   * 保存表元数据
   * 将单个表的元数据以 JSON 格式写入元数据目录。
   * @param {Object} params - { tableName: string, data: Object }
   * @returns {Object} { success: boolean }
   */
  ipcMain.handle('save-metadata', async (event, { tableName, data }) => {
    const metadataDir = getMetadataDir();
    const filePath = path.join(metadataDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  });

  /**
   * 加载所有表元数据
   * 读取元数据目录下的所有 JSON 文件，解析并返回表名到元数据的映射。
   * @returns {Object} { success: boolean, tables: Object }
   */
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

  /**
   * 删除指定表的元数据文件
   * @param {Object} params - { tableName: string }
   * @returns {Object} { success: boolean }
   */
  ipcMain.handle('delete-metadata', async (event, { tableName }) => {
    const metadataDir = getMetadataDir();
    const filePath = path.join(metadataDir, `${tableName}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  });

  /**
   * 保存用户配置
   * 将配置对象以 JSON 格式写入数据目录的 config.json 文件。
   * @param {Object} params - { config: Object }
   * @returns {Object} { success: boolean }
   */
  ipcMain.handle('save-config', async (event, { config }) => {
    const dataDir = getDataDir();
    const filePath = path.join(dataDir, 'config.json');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  });

  /**
   * 加载用户配置
   * 从数据目录读取 config.json 文件，解析并返回配置对象。
   * @returns {Object} { success: boolean, config?: Object }
   */
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

  /**
   * 获取日志文件路径
   * @returns {Object} { path: string } 日志文件的绝对路径
   */
  ipcMain.handle('get-log-path', async () => {
    return { path: path.join(getLogDir(), 'app.log') };
  });

  /**
   * 打开日志目录
   * 使用系统默认文件管理器打开日志文件夹。
   * @returns {Object} { success: boolean }
   */
  ipcMain.handle('open-log-dir', async () => {
    shell.openPath(getLogDir());
    return { success: true };
  });
}

// 应用就绪后初始化 IPC 并创建窗口
app.whenReady().then(() => {
  setupIpc();
  createWindow();

  // macOS 特有：点击 Dock 图标时若无窗口则重新创建
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS 除外，其应用通常保持运行）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
