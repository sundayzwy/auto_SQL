import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class R002_AvoidCartesianProduct extends Rule {
  id = 'R002';
  name = '避免笛卡尔积';
  description = 'JOIN 缺少 ON 条件会导致笛卡尔积，产生大量无意义的数据组合，严重影响性能';
  severity = 'error';
  dialects = ['impala', 'oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitJoinClauses(ast, issues);
    return issues;
  }

  private visitJoinClauses(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'JoinClause') {
      const joinType = node.properties?.joinType;
      const hasOnCondition = (node.children || []).length > 1;
      
      if (joinType !== 'CROSS' && !hasOnCondition) {
        issues.push(
          this.createIssue(
            'JOIN 缺少 ON 条件',
            'JOIN 语句没有 ON 条件，可能导致笛卡尔积，产生大量无意义的数据组合',
            node.location || { line: 1, column: 1 },
            '为 JOIN 添加 ON 条件，或使用 CROSS JOIN 明确表示需要笛卡尔积'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitJoinClauses(child, issues);
    }
  }
}
