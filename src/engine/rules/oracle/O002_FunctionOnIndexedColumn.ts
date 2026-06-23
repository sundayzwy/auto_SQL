import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class O002_FunctionOnIndexedColumn extends Rule {
  id = 'O002';
  name = '避免函数包裹索引字段';
  description = '在 WHERE 条件中对索引字段使用函数会导致索引失效';
  severity = 'warning';
  dialects = ['oracle'];

  private readonly functions = new Set([
    'UPPER', 'LOWER', 'TRIM', 'SUBSTR', 'SUBSTRING',
    'TO_CHAR', 'TO_DATE', 'TO_NUMBER',
    'NVL', 'DECODE', 'CAST', 'CONVERT',
  ]);

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    const whereClause = this.findWhereClause(ast);
    if (!whereClause) {
      return issues;
    }

    this.checkExpression(whereClause, issues, metadata);
    return issues;
  }

  private findWhereClause(node: ASTNode): ASTNode | null {
    if (node.type === 'WhereClause') {
      return node;
    }
    for (const child of node.children || []) {
      const found = this.findWhereClause(child);
      if (found) return found;
    }
    return null;
  }

  private checkExpression(node: ASTNode, issues: Issue[], metadata: Map<string, TableMetadata>): void {
    if (node.type === 'FunctionCall') {
      const funcName = (node.properties?.functionName || '').toUpperCase();
      if (this.functions.has(funcName)) {
        const hasColumnArg = (node.children || []).some(c => c.type === 'ColumnRef');
        if (hasColumnArg) {
          const columns = this.extractColumns(node);
          for (const col of columns) {
            const hasIndex = this.checkIndex(col, metadata);
            if (hasIndex) {
              issues.push(
                this.createIssue(
                  `函数 ${funcName} 包裹了索引字段 ${col}`,
                  `在 WHERE 条件中对索引字段 ${col} 使用 ${funcName} 函数会导致索引失效`,
                  node.location || { line: 1, column: 1 },
                  `创建函数索引：CREATE INDEX idx_${col}_${funcName.toLowerCase()} ON table_name(${funcName}(${col}))，或改写查询避免在字段上使用函数`
                )
              );
            }
          }
        }
      }
    }

    for (const child of node.children || []) {
      this.checkExpression(child, issues, metadata);
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

  private checkIndex(colName: string, metadata: Map<string, TableMetadata>): boolean {
    for (const table of metadata.values()) {
      const hasIndex = table.indexes?.some(idx => 
        idx.columns.some(c => c.toLowerCase() === colName.toLowerCase())
      );
      if (hasIndex) return true;
    }
    return false;
  }
}
