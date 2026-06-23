// ============================================================
// 基础类型定义
// ============================================================

/** SQL 方言类型 */
export type SqlDialect = 'impala' | 'oracle';

/** 严重级别 */
export type Severity = 'error' | 'warning' | 'info';

// ============================================================
// 格式化配置
// ============================================================

/** 格式化配置 */
export interface FormatConfig {
  /** 关键字大小写：upper（大写）或 lower（小写） */
  keywordCase: 'upper' | 'lower';
  /** 缩进空格数：2 或 4 */
  indentSize: 2 | 4;
  /** 字段列表风格：each-line（每行一个）或 compact（紧凑） */
  fieldListStyle: 'each-line' | 'compact';
  /** WHERE 子句风格：each-line（每行一个条件）或 compact（紧凑） */
  whereClauseStyle: 'each-line' | 'compact';
  /** 子查询缩进风格：block（块级缩进）或 inline（内联） */
  subqueryIndent: 'block' | 'inline';
}

// ============================================================
// 问题与位置
// ============================================================

/** 问题位置 */
export interface IssueLocation {
  /** 起始行号 */
  line: number;
  /** 起始列号 */
  column: number;
  /** 结束行号（可选） */
  endLine?: number;
  /** 结束列号（可选） */
  endColumn?: number;
}

/** 规则问题 */
export interface Issue {
  /** 规则 ID */
  ruleId: string;
  /** 严重级别 */
  severity: Severity;
  /** 问题标题 */
  title: string;
  /** 问题描述 */
  description: string;
  /** 问题位置 */
  location: IssueLocation;
  /** 优化建议 */
  suggestion: string;
  /** 优化后的 SQL 片段（可选） */
  optimizedSql?: string;
}

// ============================================================
// 表元数据
// ============================================================

/** 表列定义 */
export interface ColumnDefinition {
  /** 列名 */
  name: string;
  /** 数据类型 */
  type: string;
  /** 是否可空 */
  nullable?: boolean;
  /** 列注释 */
  comment?: string;
}

/** 表索引 */
export interface TableIndex {
  name: string;
  columns: string[];
  unique?: boolean;
}

/** 表元数据 */
export interface TableMetadata {
  /** 表名 */
  tableName: string;
  /** SQL 方言 */
  dialect: SqlDialect;
  /** 列定义列表 */
  columns: ColumnDefinition[];
  /** 分区键列表 */
  partitionKeys: string[];
  /** 索引列表（可选） */
  indexes?: TableIndex[];
  /** 分桶列（可选） */
  bucketColumns?: string[];
  /** 存储格式（可选） */
  storageFormat?: string;
  /** 导入时间 */
  importedAt: string;
}

/** 元数据管理器接口 */
export interface MetadataManager {
  /** 表元数据映射 */
  tables: Map<string, TableMetadata>;
  /** 添加表元数据 */
  addTable(metadata: TableMetadata): void;
  /** 移除表元数据 */
  removeTable(tableName: string): void;
  /** 获取指定表元数据 */
  getTable(tableName: string): TableMetadata | undefined;
  /** 获取所有表元数据 */
  getAllTables(): TableMetadata[];
  /** 清空所有元数据 */
  clear(): void;
}

// ============================================================
// AST 抽象语法树
// ============================================================

/** AST 节点类型 */
export type ASTNodeType =
  | 'SelectStatement'
  | 'InsertStatement'
  | 'CreateTableStatement'
  | 'FromClause'
  | 'WhereClause'
  | 'JoinClause'
  | 'GroupByClause'
  | 'OrderByClause'
  | 'HavingClause'
  | 'SelectList'
  | 'ColumnRef'
  | 'TableRef'
  | 'Expression'
  | 'FunctionCall'
  | 'Subquery'
  | 'Literal'
  | 'Operator'
  | 'Condition'
  | 'Alias';

/** AST 节点 */
export interface ASTNode {
  /** 节点类型 */
  type: ASTNodeType;
  /** 节点值（可选） */
  value?: string;
  /** 子节点列表（可选） */
  children?: ASTNode[];
  /** 源码位置（可选） */
  location?: IssueLocation;
  /** 扩展属性（可选） */
  properties?: Record<string, any>;
}

// ============================================================
// 解析与 Token
// ============================================================

/** 解析结果 */
export interface ParseResult {
  /** 是否解析成功 */
  success: boolean;
  /** AST 根节点（成功时存在） */
  ast?: ASTNode;
  /** 解析错误列表（失败时存在） */
  errors?: ParseError[];
  /** Token 列表（可选） */
  tokens?: Token[];
}

/** 解析错误 */
export interface ParseError {
  /** 错误信息 */
  message: string;
  /** 错误位置 */
  location: IssueLocation;
}

/** Token 类型 */
export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'COMMENT'
  | 'WHITESPACE'
  | 'EOF';

/** Token */
export interface Token {
  /** Token 类型 */
  type: TokenType;
  /** Token 值 */
  value: string;
  /** Token 位置 */
  location: IssueLocation;
}

// ============================================================
// 格式化与分析结果
// ============================================================

/** 格式化结果 */
export interface FormatResult {
  /** 是否格式化成功 */
  success: boolean;
  /** 格式化后的 SQL（成功时存在） */
  formattedSql?: string;
  /** 格式化过程中的错误 */
  errors?: ParseError[];
}

/** 分析结果 */
export interface AnalysisResult {
  /** 检测到的问题列表 */
  issues: Issue[];
  /** 优化后的 SQL（可选） */
  optimizedSql?: string;
  /** 是否使用了元数据 */
  metadataUsed: boolean;
}

/** 规则定义 */
export interface RuleDefinition {
  /** 规则 ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 严重级别 */
  severity: Severity;
  /** 适用的方言列表 */
  dialects: SqlDialect[];
  /** 是否启用 */
  enabled: boolean;
}

// ============================================================
// 用户配置与窗口布局
// ============================================================

/** 用户配置 */
export interface UserConfig {
  /** SQL 方言 */
  dialect: SqlDialect;
  /** 格式化配置 */
  formatConfig: FormatConfig;
  /** 各规则的启用状态 */
  enabledRules: Record<string, boolean>;
  /** 窗口布局配置（可选） */
  windowLayout?: WindowLayout;
}

/** 窗口布局 */
export interface WindowLayout {
  /** SQL 输入面板尺寸 */
  sqlInput: PanelSize;
  /** 格式化输出面板尺寸 */
  formattedOutput: PanelSize;
  /** 建议面板尺寸 */
  suggestions: PanelSize;
  /** 优化输出面板尺寸 */
  optimizedOutput: PanelSize;
}

/** 面板尺寸 */
export interface PanelSize {
  /** 宽度（可选） */
  width?: number;
  /** 高度（可选） */
  height?: number;
}

// ============================================================
// IPC 通道常量
// ============================================================

/** IPC 通道名称常量 */
export const IPC_CHANNELS = {
  /** 文件操作 */
  SAVE_FILE: 'save-file',
  /** 文件操作 */
  LOAD_FILE: 'load-file',
  
  /** 元数据操作 */
  SAVE_METADATA: 'save-metadata',
  /** 元数据操作 */
  LOAD_METADATA: 'load-metadata',
  /** 元数据操作 */
  DELETE_METADATA: 'delete-metadata',
  
  /** 配置操作 */
  SAVE_CONFIG: 'save-config',
  /** 配置操作 */
  LOAD_CONFIG: 'load-config',
  
  /** 日志操作 */
  GET_LOG_PATH: 'get-log-path',
  /** 日志操作 */
  OPEN_LOG_DIR: 'open-log-dir',
} as const;

// ============================================================
// 默认配置
// ============================================================

/** 默认格式化配置 */
export const DEFAULT_FORMAT_CONFIG: FormatConfig = {
  keywordCase: 'upper',
  indentSize: 2,
  fieldListStyle: 'each-line',
  whereClauseStyle: 'each-line',
  subqueryIndent: 'block',
};

/** 默认用户配置 */
export const DEFAULT_USER_CONFIG: UserConfig = {
  dialect: 'impala',
  formatConfig: DEFAULT_FORMAT_CONFIG,
  enabledRules: {},
};
