import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class R004_AvoidFunctionOnColumn extends Rule {
  id = 'R004';
  name = '避免在 WHERE 中对字段使用函数';
  description = '在 WHERE 条件中对字段使用函数会导致索引失效，引发全表扫描';
  severity = 'warning';
  dialects = ['impala', 'oracle'];

  private readonly functions = new Set([
    'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
    'UPPER', 'LOWER', 'TRIM', 'SUBSTR', 'SUBSTRING',
    'CAST', 'CONVERT', 'TO_DATE', 'TO_CHAR', 'TO_NUMBER',
    'DATE_ADD', 'DATE_SUB', 'DATEDIFF',
  ]);

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitWhereClause(ast, issues);
    return issues;
  }

  private visitWhereClause(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'WhereClause') {
      this.checkExpression(node, issues);
    }

    for (const child of node.children || []) {
      this.visitWhereClause(child, issues);
    }
  }

  private checkExpression(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'FunctionCall') {
      const funcName = (node.properties?.functionName || '').toUpperCase();
      if (this.functions.has(funcName)) {
        const hasColumnArg = (node.children || []).some(c => c.type === 'ColumnRef');
        if (hasColumnArg) {
          issues.push(
            this.createIssue(
              `WHERE 条件中对字段使用了 ${funcName} 函数`,
              '在 WHERE 条件中对字段使用函数会导致索引失效，引发全表扫描',
              node.location || { line: 1, column: 1 },
              `将函数移到等式右边，或使用范围条件替代。例如：将 WHERE YEAR(date_col) = 2024 改为 WHERE date_col >= '2024-01-01' AND date_col < '2025-01-01'`
            )
          );
        }
      }
    }

    for (const child of node.children || []) {
      this.checkExpression(child, issues);
    }
  }
}
