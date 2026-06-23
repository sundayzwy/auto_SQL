import { create } from 'zustand';
import { SqlDialect, Issue, TableMetadata, FormatConfig, DEFAULT_FORMAT_CONFIG } from '../../shared/types';

/**
 * SQL 状态管理 Store
 *
 * 基于 Zustand 实现的全局状态管理，用于在四个面板组件之间共享数据。
 * 包含以下核心状态：
 * - SQL 文本：原始输入、格式化结果、优化结果
 * - 方言配置：当前选中的 SQL 方言（Impala / Oracle）
 * - 分析结果：规则引擎检测到的问题列表
 * - 元数据：导入的表结构信息（DDL 解析结果）
 * - 格式化偏好：关键字大小写、缩进风格等配置
 */
interface SqlState {
  /** 用户输入的原始 SQL 文本 */
  inputSql: string;
  /** 格式化后的 SQL 文本 */
  formattedSql: string;
  /** 优化后的 SQL 文本 */
  optimizedSql: string;
  /** 当前选中的 SQL 方言 */
  dialect: SqlDialect;
  /** 性能分析检测到的问题列表 */
  issues: Issue[];
  /** 已导入的表元数据映射表（表名 -> 元数据） */
  tables: Map<string, TableMetadata>;
  /** 格式化配置 */
  formatConfig: FormatConfig;
  
  /** 设置原始输入 SQL */
  setInputSql: (sql: string) => void;
  /** 设置格式化后的 SQL */
  setFormattedSql: (sql: string) => void;
  /** 设置优化后的 SQL */
  setOptimizedSql: (sql: string) => void;
  /** 设置 SQL 方言 */
  setDialect: (dialect: SqlDialect) => void;
  /** 设置问题列表 */
  setIssues: (issues: Issue[]) => void;
  /** 添加表元数据（表名小写作为 key） */
  addTable: (table: TableMetadata) => void;
  /** 移除指定表名的元数据 */
  removeTable: (tableName: string) => void;
  /** 清空所有表元数据 */
  clearTables: () => void;
  /** 设置格式化配置 */
  setFormatConfig: (config: FormatConfig) => void;
  /** 重置输入、格式化结果和优化结果（保留方言和表元数据） */
  reset: () => void;
}

export const useSqlStore = create<SqlState>((set) => ({
  inputSql: '',
  formattedSql: '',
  optimizedSql: '',
  dialect: 'impala',
  issues: [],
  tables: new Map(),
  formatConfig: DEFAULT_FORMAT_CONFIG,
  
  setInputSql: (sql) => set({ inputSql: sql }),
  setFormattedSql: (sql) => set({ formattedSql: sql }),
  setOptimizedSql: (sql) => set({ optimizedSql: sql }),
  setDialect: (dialect) => set({ dialect }),
  setIssues: (issues) => set({ issues }),
  addTable: (table) => set((state) => {
    const newTables = new Map(state.tables);
    newTables.set(table.tableName.toLowerCase(), table);
    return { tables: newTables };
  }),
  removeTable: (tableName) => set((state) => {
    const newTables = new Map(state.tables);
    newTables.delete(tableName.toLowerCase());
    return { tables: newTables };
  }),
  clearTables: () => set({ tables: new Map() }),
  setFormatConfig: (config) => set({ formatConfig: config }),
  reset: () => set({
    inputSql: '',
    formattedSql: '',
    optimizedSql: '',
    issues: [],
  }),
}));
