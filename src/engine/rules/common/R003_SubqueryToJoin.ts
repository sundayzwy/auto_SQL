import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * R003 - 子查询改写为 JOIN
 *
 * 检测相关子查询的使用场景。在大多数情况下，相关子查询可以被改写为 JOIN，
 * 后者通常具有更好的执行性能。当检测到包含 WHERE 条件的子查询时，
 * 此规则会建议将其改写为 JOIN 形式。该规则适用于 Impala 和 Oracle 两种方言。
 */
export class R003_SubqueryToJoin extends Rule {
  id = 'R003';
  name = '子查询改写为 JOIN';
  description = '相关子查询通常可以改写为 JOIN，提升查询性能';
  severity = 'warning' as const;
  dialects = ['impala', 'oracle'] as const;

  /**
   * 分析 AST，遍历查找可能可以改写为 JOIN 的子查询
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的可优化子查询问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitSubqueries(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 Subquery 节点，检查是否包含 WHERE 条件的子查询
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitSubqueries(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'Subquery' && node.children && node.children.length > 0) {
      const subquery = node.children[0];
      if (subquery.type === 'SelectStatement') {
        const hasWhereClause = (subquery.children || []).some(c => c.type === 'WhereClause');
        if (hasWhereClause) {
          issues.push(
            this.createIssue(
              '子查询可能可以改写为 JOIN',
              '相关子查询通常可以改写为 JOIN，提升查询性能',
              node.location || { line: 1, column: 1 },
              '考虑将子查询改写为 JOIN 形式，例如：SELECT a.* FROM table_a a JOIN table_b b ON a.id = b.id'
            )
          );
        }
      }
    }

    for (const child of node.children || []) {
      this.visitSubqueries(child, issues);
    }
  }
}
