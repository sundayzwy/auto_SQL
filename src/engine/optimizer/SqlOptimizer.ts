import { Issue } from '../../shared/types';

/**
 * SQL 优化器
 * 根据规则引擎检测到的问题（Issue）自动对 SQL 进行优化转换。
 * 支持多种优化策略：SELECT * 替换为具体列名、UNION 转 UNION ALL、
 * 列上函数调用优化等。同时提供 diff 功能用于对比优化前后的差异。
 */
export class SqlOptimizer {
  /**
   * 优化 SQL 语句
   * 首先检查 Issue 列表中是否包含优化后的 SQL（optimizedSql），
   * 如果有则直接使用；然后应用通用优化规则进行进一步优化。
   * @param sql - 原始 SQL 语句
   * @param issues - 规则引擎检测到的问题列表
   * @returns 优化后的 SQL 语句
   */
  optimize(sql: string, issues: Issue[]): string {
    let optimizedSql = sql;

    for (const issue of issues) {
      if (issue.optimizedSql) {
        optimizedSql = issue.optimizedSql;
        break;
      }
    }

    optimizedSql = this.applyCommonOptimizations(optimizedSql, issues);

    return optimizedSql;
  }

  /**
   * 应用通用优化规则
   * 根据 Issue 列表中匹配的规则 ID，依次应用对应的优化策略：
   * - R001: SELECT * 替换为 TODO 注释
   * - R006: UNION 替换为 UNION ALL
   * - R004: 列上函数调用优化（如 YEAR 范围转换、UPPER 去重）
   * @param sql - 待优化的 SQL 语句
   * @param issues - 规则引擎检测到的问题列表
   * @returns 应用通用优化后的 SQL 语句
   */
  private applyCommonOptimizations(sql: string, issues: Issue[]): string {
    let result = sql;

    const selectStarIssue = issues.find(i => i.ruleId === 'R001');
    if (selectStarIssue) {
      result = this.replaceSelectStar(result);
    }

    const unionIssue = issues.find(i => i.ruleId === 'R006');
    if (unionIssue) {
      result = this.replaceUnionWithUnionAll(result);
    }

    const functionIssue = issues.find(i => i.ruleId === 'R004');
    if (functionIssue) {
      result = this.optimizeFunctionOnColumn(result);
    }

    return result;
  }

  /**
   * 替换 SELECT *
   * 将 SELECT * 替换为带有 TODO 注释的占位符，提示开发者指定具体列名。
   * @param sql - 原始 SQL 语句
   * @returns 替换后的 SQL 语句
   */
  private replaceSelectStar(sql: string): string {
    return sql.replace(/SELECT\s+\*/gi, 'SELECT /* TODO: specify columns */');
  }

  /**
   * 替换 UNION 为 UNION ALL
   * 将不含 ALL 关键字的 UNION 替换为 UNION ALL，避免不必要的去重操作。
   * @param sql - 原始 SQL 语句
   * @returns 替换后的 SQL 语句
   */
  private replaceUnionWithUnionAll(sql: string): string {
    return sql.replace(/\bUNION\b(?!\s+ALL)/gi, 'UNION ALL');
  }

  /**
   * 优化列上的函数调用
   * 将可能影响索引使用的函数调用转换为范围查询：
   * - YEAR(col) = 2024 → col >= '2024-01-01' AND col < '2025-01-01'
   * - UPPER(col) = UPPER('value') → col = 'value'（大小写敏感环境下）
   * @param sql - 原始 SQL 语句
   * @returns 优化后的 SQL 语句
   */
  private optimizeFunctionOnColumn(sql: string): string {
    let result = sql;

    result = result.replace(
      /YEAR\s*\(\s*(\w+)\s*\)\s*=\s*(\d{4})/gi,
      "$1 >= '$2-01-01' AND $1 < '" + (parseInt('$2') + 1) + "-01-01'"
    );

    result = result.replace(
      /UPPER\s*\(\s*(\w+)\s*\)\s*=\s*UPPER\s*\(\s*'([^']+)'\s*\)/gi,
      "$1 = '$2'"
    );

    return result;
  }

  /**
   * 生成优化前后的差异对比
   * 逐行比较原始 SQL 和优化后 SQL，找出新增的行和已删除的行。
   * @param original - 原始 SQL 语句
   * @param optimized - 优化后的 SQL 语句
   * @returns 包含 added（新增行）和 removed（删除行）的差异对象
   */
  generateDiff(original: string, optimized: string): {
    added: string[];
    removed: string[];
  } {
    const originalLines = original.split('\n');
    const optimizedLines = optimized.split('\n');

    const removed: string[] = [];
    const added: string[] = [];

    const originalSet = new Set(originalLines);
    const optimizedSet = new Set(optimizedLines);

    for (const line of originalLines) {
      if (!optimizedSet.has(line)) {
        removed.push(line);
      }
    }

    for (const line of optimizedLines) {
      if (!originalSet.has(line)) {
        added.push(line);
      }
    }

    return { added, removed };
  }
}
