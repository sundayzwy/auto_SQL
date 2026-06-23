import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class I005_CountDistinct extends Rule {
  id = 'I005';
  name = 'COUNT(DISTINCT) 优化';
  description = '大数据量时 COUNT(DISTINCT) 会导致数据倾斜，建议改写为 GROUP BY + COUNT';
  severity = 'warning';
  dialects = ['impala'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitFunctionCalls(ast, issues);
    return issues;
  }

  private visitFunctionCalls(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'FunctionCall') {
      const funcName = (node.properties?.functionName || '').toUpperCase();
      const isDistinct = node.properties?.distinct;
      
      if (funcName === 'COUNT' && isDistinct) {
        issues.push(
          this.createIssue(
            '使用了 COUNT(DISTINCT)',
            'COUNT(DISTINCT) 在大数据量时会导致数据倾斜，所有数据需要发送到同一个节点去重',
            node.location || { line: 1, column: 1 },
            '考虑改写为两层聚合：先 GROUP BY 去重，再 COUNT。例如：SELECT COUNT(*) FROM (SELECT DISTINCT col FROM table) t'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitFunctionCalls(child, issues);
    }
  }
}
