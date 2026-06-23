const { contextBridge, ipcRenderer } = require('electron');

/**
 * 预加载脚本：通过 contextBridge 向渲染进程暴露安全的 API
 *
 * 所有 API 挂载在 window.electronAPI 对象上，渲染进程通过该对象调用主进程功能。
 * 使用 ipcRenderer.invoke 实现渲染进程与主进程之间的异步通信。
 * 支持以下功能：
 * - 文件操作：保存/加载 SQL 文件
 * - 元数据操作：保存/加载/删除表结构元数据
 * - 配置操作：保存/加载用户配置
 * - 日志操作：获取日志路径、打开日志目录
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /** 保存文件到磁盘（弹出保存对话框） */
  saveFile: (content, defaultPath) =>
    ipcRenderer.invoke('save-file', { content, defaultPath }),
  /** 从磁盘加载文件（弹出打开对话框） */
  loadFile: () =>
    ipcRenderer.invoke('load-file'),
  /** 保存单个表的元数据到 JSON 文件 */
  saveMetadata: (tableName, data) =>
    ipcRenderer.invoke('save-metadata', { tableName, data }),
  /** 加载所有已保存的表元数据 */
  loadMetadata: () =>
    ipcRenderer.invoke('load-metadata'),
  /** 删除指定表的元数据文件 */
  deleteMetadata: (tableName) =>
    ipcRenderer.invoke('delete-metadata', { tableName }),
  /** 保存应用配置到 config.json */
  saveConfig: (config) =>
    ipcRenderer.invoke('save-config', { config }),
  /** 加载已保存的应用配置 */
  loadConfig: () =>
    ipcRenderer.invoke('load-config'),
  /** 获取日志文件路径 */
  getLogPath: () =>
    ipcRenderer.invoke('get-log-path'),
  /** 打开日志目录（使用系统文件管理器） */
  openLogDir: () =>
    ipcRenderer.invoke('open-log-dir'),
});
