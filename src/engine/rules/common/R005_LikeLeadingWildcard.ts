import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class R005_LikeLeadingWildcard extends Rule {
  id = 'R005';
  name = 'LIKE 前缀通配符检测';
  description = 'LIKE 模式以通配符开头（如 %abc）无法利用索引，会导致全表扫描';
  severity = 'warning';
  dialects = ['impala', 'oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitConditions(ast, issues);
    return issues;
  }

  private visitConditions(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'Condition' && node.properties?.operator === 'LIKE') {
      const patternNode = (node.children || [])[1];
      if (patternNode && patternNode.type === 'Literal') {
        const pattern = patternNode.value || '';
        if (pattern.startsWith("'%") || pattern.startsWith('"%')) {
          issues.push(
            this.createIssue(
              'LIKE 模式以通配符开头',
              `LIKE 模式 ${pattern} 以通配符开头，无法利用索引，会导致全表扫描`,
              node.location || { line: 1, column: 1 },
              '如果可能，使用前缀匹配（如 abc%）替代前缀通配符（如 %abc），或考虑使用全文索引'
            )
          );
        }
      }
    }

    for (const child of node.children || []) {
      this.visitConditions(child, issues);
    }
  }
}
