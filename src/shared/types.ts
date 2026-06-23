// SQL 方言类型
export type SqlDialect = 'impala' | 'oracle';

// 严重级别
export type Severity = 'error' | 'warning' | 'info';

// 格式化配置
export interface FormatConfig {
  keywordCase: 'upper' | 'lower';
  indentSize: 2 | 4;
  fieldListStyle: 'each-line' | 'compact';
  whereClauseStyle: 'each-line' | 'compact';
  subqueryIndent: 'block' | 'inline';
}

// 问题位置
export interface IssueLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

// 规则问题
export interface Issue {
  ruleId: string;
  severity: Severity;
  title: string;
  description: string;
  location: IssueLocation;
  suggestion: string;
  optimizedSql?: string;
}

// 表列定义
export interface ColumnDefinition {
  name: string;
  type: string;
  nullable?: boolean;
  comment?: string;
}

// 表元数据
export interface TableMetadata {
  tableName: string;
  dialect: SqlDialect;
  columns: ColumnDefinition[];
  partitionKeys: string[];
  bucketColumns?: string[];
  storageFormat?: string;
  importedAt: string;
}

// 元数据管理器
export interface MetadataManager {
  tables: Map<string, TableMetadata>;
  addTable(metadata: TableMetadata): void;
  removeTable(tableName: string): void;
  getTable(tableName: string): TableMetadata | undefined;
  getAllTables(): TableMetadata[];
  clear(): void;
}

// AST 节点类型
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

// AST 节点
export interface ASTNode {
  type: ASTNodeType;
  value?: string;
  children?: ASTNode[];
  location?: IssueLocation;
  properties?: Record<string, any>;
}

// 解析结果
export interface ParseResult {
  success: boolean;
  ast?: ASTNode;
  errors?: ParseError[];
  tokens?: Token[];
}

// 解析错误
export interface ParseError {
  message: string;
  location: IssueLocation;
}

// Token 类型
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

// Token
export interface Token {
  type: TokenType;
  value: string;
  location: IssueLocation;
}

// 格式化结果
export interface FormatResult {
  success: boolean;
  formattedSql?: string;
  errors?: ParseError[];
}

// 分析结果
export interface AnalysisResult {
  issues: Issue[];
  optimizedSql?: string;
  metadataUsed: boolean;
}

// 规则定义
export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  dialects: SqlDialect[];
  enabled: boolean;
}

// 用户配置
export interface UserConfig {
  dialect: SqlDialect;
  formatConfig: FormatConfig;
  enabledRules: Record<string, boolean>;
  windowLayout?: WindowLayout;
}

// 窗口布局
export interface WindowLayout {
  sqlInput: PanelSize;
  formattedOutput: PanelSize;
  suggestions: PanelSize;
  optimizedOutput: PanelSize;
}

// 面板尺寸
export interface PanelSize {
  width?: number;
  height?: number;
}

// IPC 通道
export const IPC_CHANNELS = {
  // 文件操作
  SAVE_FILE: 'save-file',
  LOAD_FILE: 'load-file',
  
  // 元数据操作
  SAVE_METADATA: 'save-metadata',
  LOAD_METADATA: 'load-metadata',
  DELETE_METADATA: 'delete-metadata',
  
  // 配置操作
  SAVE_CONFIG: 'save-config',
  LOAD_CONFIG: 'load-config',
  
  // 日志操作
  GET_LOG_PATH: 'get-log-path',
  OPEN_LOG_DIR: 'open-log-dir',
} as const;

// 默认格式化配置
export const DEFAULT_FORMAT_CONFIG: FormatConfig = {
  keywordCase: 'upper',
  indentSize: 2,
  fieldListStyle: 'each-line',
  whereClauseStyle: 'each-line',
  subqueryIndent: 'block',
};

// 默认用户配置
export const DEFAULT_USER_CONFIG: UserConfig = {
  dialect: 'impala',
  formatConfig: DEFAULT_FORMAT_CONFIG,
  enabledRules: {},
};
