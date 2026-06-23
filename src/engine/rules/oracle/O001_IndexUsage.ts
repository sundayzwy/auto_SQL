import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class O001_IndexUsage extends Rule {
  id = 'O001';
  name = '索引使用检测';
  description = 'WHERE 条件中的字段如果没有索引，会导致全表扫描';
  severity = 'warning';
  dialects = ['oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    const whereClause = this.findWhereClause(ast);
    if (!whereClause) {
      return issues;
    }

    const tables = this.extractTables(ast);
    const whereColumns = this.extractWhereColumns(whereClause);

    for (const table of tables) {
      const tableMeta = metadata.get(table.toLowerCase());
      if (tableMeta) {
        for (const col of whereColumns) {
          const hasIndex = tableMeta.indexes?.some(idx => 
            idx.columns.some(c => c.toLowerCase() === col.toLowerCase())
          );
          
          if (!hasIndex) {
            issues.push(
              this.createIssue(
                `字段 ${col} 可能缺少索引`,
                `表 ${table} 的字段 ${col} 在 WHERE 条件中使用，但未检测到索引`,
                whereClause.location || { line: 1, column: 1 },
                `为字段 ${col} 创建索引以提升查询性能：CREATE INDEX idx_${table}_${col} ON ${table}(${col})`
              )
            );
          }
        }
      }
    }

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

  private extractTables(node: ASTNode): string[] {
    const tables: string[] = [];
    if (node.type === 'TableRef' && node.value) {
      tables.push(node.value);
    }
    for (const child of node.children || []) {
      tables.push(...this.extractTables(child));
    }
    return tables;
  }

  private extractWhereColumns(node: ASTNode): string[] {
    const columns: string[] = [];
    if (node.type === 'ColumnRef' && node.value) {
      const parts = node.value.split('.');
      columns.push(parts[parts.length - 1]);
    }
    for (const child of node.children || []) {
      columns.push(...this.extractWhereColumns(child));
    }
    return columns;
  }
}
