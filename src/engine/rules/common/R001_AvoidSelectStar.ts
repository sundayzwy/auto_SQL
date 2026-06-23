import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class R001_AvoidSelectStar extends Rule {
  id = 'R001';
  name = '避免 SELECT *';
  description = '使用 SELECT * 会导致查询所有字段，增加不必要的 I/O 和网络传输，建议明确指定需要的字段';
  severity = 'warning';
  dialects = ['impala', 'oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitSelectList(ast, issues);
    return issues;
  }

  private visitSelectList(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'SelectList') {
      for (const child of node.children || []) {
        if (child.type === 'ColumnRef' && child.value === '*') {
          issues.push(
            this.createIssue(
              '使用了 SELECT *',
              'SELECT * 会查询所有字段，增加不必要的 I/O 和网络传输',
              child.location || { line: 1, column: 1 },
              '明确指定需要的字段，例如：SELECT id, name, age FROM table'
            )
          );
        }
      }
    }

    for (const child of node.children || []) {
      this.visitSelectList(child, issues);
    }
  }
}
