import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class O004_AvoidOrFullScan extends Rule {
  id = 'O004';
  name = '避免 OR 导致全表扫描';
  description = 'OR 条件可能导致索引失效，建议改写为 UNION 或使用复合索引';
  severity = 'warning';
  dialects = ['oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitWhereClause(ast, issues);
    return issues;
  }

  private visitWhereClause(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'WhereClause') {
      this.checkOrConditions(node, issues);
    }

    for (const child of node.children || []) {
      this.visitWhereClause(child, issues);
    }
  }

  private checkOrConditions(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'Expression' && node.properties?.operator === 'OR') {
      const left = (node.children || [])[0];
      const right = (node.children || [])[1];
      
      if (left && right) {
        const leftColumns = this.extractColumns(left);
        const rightColumns = this.extractColumns(right);
        
        if (leftColumns.length > 0 && rightColumns.length > 0) {
          const allColumns = [...new Set([...leftColumns, ...rightColumns])];
          
          if (allColumns.length > 1) {
            issues.push(
              this.createIssue(
                'OR 条件可能导致全表扫描',
                `OR 条件涉及多个字段 (${allColumns.join(', ')})，可能导致索引失效`,
                node.location || { line: 1, column: 1 },
                '考虑将 OR 改写为 UNION ALL，或创建包含这些字段的复合索引'
              )
            );
          }
        }
      }
    }

    for (const child of node.children || []) {
      this.checkOrConditions(child, issues);
    }
  }

  private extractColumns(node: ASTNode): string[] {
    const columns: string[] = [];
    if (node.type === 'ColumnRef' && node.value) {
      const parts = node.value.split('.');
      columns.push(parts[parts.length - 1]);
    }
    for (const child of node.children || []) {
      columns.push(...this.extractColumns(child));
    }
    return columns;
  }
}
