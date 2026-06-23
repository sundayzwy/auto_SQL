/**
 * SQL 分析服务层
 *
 * 封装引擎层的调用，为 UI 层提供纯函数接口。
 * 该层负责：
 * - SQL 格式化（调用 Formatter）
 * - SQL 性能分析（调用 Parser + RuleEngine）
 * - SQL 优化（调用 SqlOptimizer）
 * - DDL 元数据导入（调用 DdlParser）
 *
 * 所有函数均为纯函数，不依赖 React 或状态管理。
 */

import { Parser } from '../../engine/parser';
import { Formatter } from '../../engine/formatter';
import { RuleEngine } from '../../engine/rules';
import { SqlOptimizer } from '../../engine/optimizer';
import { DdlParser } from '../../engine/metadata';
import type {
  SqlDialect,
  TableMetadata,
  FormatConfig,
  FormatResult,
  AnalysisResult,
} from '../../shared/types';

/**
 * 格式化 SQL 语句
 *
 * @param sql - 原始 SQL 字符串
 * @param dialect - SQL 方言（impala / oracle）
 * @param config - 格式化配置
 * @returns 格式化结果，包含成功标志和格式化后的 SQL
 */
export function formatSql(
  sql: string,
  config: FormatConfig
): FormatResult {
  const formatter = new Formatter(config);
  return formatter.format(sql);
}

/**
 * 分析 SQL 语句性能
 *
 * 执行完整分析流水线：解析 → 规则检查 → 生成优化 SQL
 *
 * @param sql - 原始 SQL 字符串
 * @param dialect - SQL 方言
 * @param metadata - 可选的表元数据，用于增强分析精度
 * @returns 分析结果，包含问题列表和优化后的 SQL
 */
export function analyzeSql(
  sql: string,
  dialect: SqlDialect,
  metadata?: Map<string, TableMetadata>
): AnalysisResult {
  const parser = new Parser();
  const parseResult = parser.parse(sql);

  // 解析失败时返回空结果
  if (!parseResult.success || !parseResult.ast) {
    return { issues: [], metadataUsed: false };
  }

  // 执行规则引擎分析
  const ruleEngine = new RuleEngine();
  const issues = ruleEngine.analyze(parseResult.ast, dialect, metadata);

  let optimizedSql: string | undefined;
  if (issues.length > 0) {
    const optimizer = new SqlOptimizer();
    optimizedSql = optimizer.optimize(sql, issues);
  }

  return {
    issues,
    optimizedSql,
    metadataUsed: metadata !== undefined && metadata.size > 0,
  };
}

/**
 * 解析 DDL 语句，提取表元数据
 *
 * @param ddl - DDL 语句文本（支持多条以分号分隔的语句）
 * @param dialect - SQL 方言
 * @returns 解析出的表元数据列表
 */
export function parseDdl(
  ddl: string,
  dialect: SqlDialect
): TableMetadata[] {
  const ddlParser = new DdlParser();
  return ddlParser.parse(ddl, dialect);
}