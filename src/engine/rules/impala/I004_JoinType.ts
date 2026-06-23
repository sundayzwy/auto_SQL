import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class I004_JoinType extends Rule {
  id = 'I004';
  name = '使用合适的 JOIN 类型';
  description = '根据表大小和 JOIN 场景选择合适的 JOIN 类型和 hint';
  severity = 'info';
  dialects = ['impala'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitJoinClauses(ast, issues);
    return issues;
  }

  private visitJoinClauses(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'JoinClause') {
      const joinType = node.properties?.joinType;
      
      if (joinType === 'LEFT' || joinType === 'RIGHT') {
        issues.push(
          this.createIssue(
            `使用了 ${joinType} JOIN`,
            `${joinType} JOIN 会保留所有左/右表数据，可能导致数据量膨胀`,
            node.location || { line: 1, column: 1 },
            '确认是否真的需要 OUTER JOIN，如果可以使用 INNER JOIN 替代，性能会更好。也可以考虑使用 [BROADCAST] 或 [SHUFFLE] hint 优化'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitJoinClauses(child, issues);
    }
  }
}
