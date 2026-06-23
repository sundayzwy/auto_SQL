import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class R008_ExistsInsteadofIn extends Rule {
  id = 'R008';
  name = 'EXISTS 替代 IN (子查询)';
  description = '大表场景下 EXISTS 通常比 IN (子查询) 更高效';
  severity = 'info';
  dialects = ['impala', 'oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitConditions(ast, issues);
    return issues;
  }

  private visitConditions(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'Condition' && node.properties?.operator === 'IN') {
      const hasSubquery = (node.children || []).some(c => c.type === 'Subquery');
      if (hasSubquery) {
        issues.push(
          this.createIssue(
            'IN (子查询) 可考虑改写为 EXISTS',
            '大表场景下 EXISTS 通常比 IN (子查询) 更高效',
            node.location || { line: 1, column: 1 },
            '将 IN (SELECT ...) 改写为 EXISTS (SELECT 1 FROM ... WHERE ...)'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitConditions(child, issues);
    }
  }
}
