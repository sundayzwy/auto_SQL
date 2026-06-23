import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * R004 - 避免在 WHERE 中对字段使用函数
 *
 * 检测 WHERE 条件中是否对字段使用了函数（如 YEAR、UPPER、TO_CHAR 等）。
 * 在 WHERE 条件中对字段使用函数会导致数据库无法使用该字段上的索引，
 * 从而引发全表扫描，严重影响查询性能。该规则适用于 Impala 和 Oracle 两种方言。
 */
export class R004_AvoidFunctionOnColumn extends Rule {
  id = 'R004';
  name = '避免在 WHERE 中对字段使用函数';
  description = '在 WHERE 条件中对字段使用函数会导致索引失效，引发全表扫描';
  severity = 'warning' as const;
  dialects = ['impala', 'oracle'] as const;

  private readonly functions = new Set([
    'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
    'UPPER', 'LOWER', 'TRIM', 'SUBSTR', 'SUBSTRING',
    'CAST', 'CONVERT', 'TO_DATE', 'TO_CHAR', 'TO_NUMBER',
    'DATE_ADD', 'DATE_SUB', 'DATEDIFF',
  ]);

  /**
   * 分析 AST，在 WHERE 子句中检查是否存在对字段使用函数的情况
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的字段函数使用问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitWhereClause(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST，定位 WhereClause 节点并对其内容进行表达式检查
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitWhereClause(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'WhereClause') {
      this.checkExpression(node, issues);
    }

    for (const child of node.children || []) {
      this.visitWhereClause(child, issues);
    }
  }

  /**
   * 递归检查表达式节点，识别 FunctionCall 中是否对字段使用了已知的性能敏感函数
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
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
