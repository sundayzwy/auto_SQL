import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class I003_DataSkew extends Rule {
  id = 'I003';
  name = '避免数据倾斜';
  description = 'JOIN 键可能存在数据倾斜风险，导致某些节点处理数据量过大';
  severity = 'warning';
  dialects = ['impala'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitJoinClauses(ast, issues);
    return issues;
  }

  private visitJoinClauses(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'JoinClause') {
      const joinType = node.properties?.joinType;
      
      if (joinType !== 'CROSS') {
        const onCondition = (node.children || [])[1];
        if (onCondition) {
          const joinColumns = this.extractJoinColumns(onCondition);
          
          if (joinColumns.length > 0) {
            issues.push(
              this.createIssue(
                '可能存在数据倾斜风险',
                `JOIN 键 ${joinColumns.join(', ')} 可能存在数据分布不均匀的情况`,
                node.location || { line: 1, column: 1 },
                '检查 JOIN 键的数据分布，如果存在倾斜，可以考虑使用 [SHUFFLE] hint 或添加随机前缀打散数据'
              )
            );
          }
        }
      }
    }

    for (const child of node.children || []) {
      this.visitJoinClauses(child, issues);
    }
  }

  private extractJoinColumns(node: ASTNode): string[] {
    const columns: string[] = [];
    if (node.type === 'ColumnRef' && node.value) {
      columns.push(node.value);
    }
    for (const child of node.children || []) {
      columns.push(...this.extractJoinColumns(child));
    }
    return columns;
  }
}
