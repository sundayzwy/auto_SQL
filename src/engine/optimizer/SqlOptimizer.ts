import { Issue } from '../../shared/types';

export class SqlOptimizer {
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

  private replaceSelectStar(sql: string): string {
    return sql.replace(/SELECT\s+\*/gi, 'SELECT /* TODO: specify columns */');
  }

  private replaceUnionWithUnionAll(sql: string): string {
    return sql.replace(/\bUNION\b(?!\s+ALL)/gi, 'UNION ALL');
  }

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
