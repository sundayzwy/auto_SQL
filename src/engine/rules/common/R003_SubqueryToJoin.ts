import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class R003_SubqueryToJoin extends Rule {
  id = 'R003';
  name = '子查询改写为 JOIN';
  description = '相关子查询通常可以改写为 JOIN，提升查询性能';
  severity = 'warning';
  dialects = ['impala', 'oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitSubqueries(ast, issues);
    return issues;
  }

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
