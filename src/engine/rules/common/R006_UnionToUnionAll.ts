import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class R006_UnionToUnionAll extends Rule {
  id = 'R006';
  name = 'UNION 改写为 UNION ALL';
  description = 'UNION 会进行去重操作，如果不需要去重，应使用 UNION ALL 以提升性能';
  severity = 'info';
  dialects = ['impala', 'oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitUnion(ast, issues);
    return issues;
  }

  private visitUnion(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'Expression' && node.properties?.operator === 'UNION') {
      issues.push(
        this.createIssue(
          '使用了 UNION',
          'UNION 会进行去重操作，消耗额外的 CPU 和内存资源',
          node.location || { line: 1, column: 1 },
          '如果不需要去重，请改用 UNION ALL，性能会显著提升'
        )
      );
    }

    for (const child of node.children || []) {
      this.visitUnion(child, issues);
    }
  }
}
