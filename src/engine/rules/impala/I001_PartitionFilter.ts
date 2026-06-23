import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class I001_PartitionFilter extends Rule {
  id = 'I001';
  name = '分区字段必须使用';
  description = '查询分区表时应在 WHERE 条件中包含分区字段过滤，否则会导致全分区扫描';
  severity = 'warning';
  dialects = ['impala'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    const tables = this.extractTables(ast);
    const whereColumns = this.extractWhereColumns(ast);

    for (const table of tables) {
      const tableMeta = metadata.get(table.toLowerCase());
      if (tableMeta && tableMeta.partitionKeys.length > 0) {
        const hasPartitionFilter = tableMeta.partitionKeys.some(pk =>
          whereColumns.some(wc => wc.toLowerCase() === pk.toLowerCase())
        );

        if (!hasPartitionFilter) {
          issues.push(
            this.createIssue(
              `表 ${table} 的分区字段未使用`,
              `表 ${table} 按 ${tableMeta.partitionKeys.join(', ')} 分区，但查询未对这些字段进行过滤，将导致全分区扫描`,
              ast.location || { line: 1, column: 1 },
              `在 WHERE 条件中添加分区字段过滤，例如：WHERE ${tableMeta.partitionKeys[0]} = 'value'`
            )
          );
        }
      }
    }

    return issues;
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
    if (node.type === 'WhereClause') {
      this.collectColumns(node, columns);
    }
    for (const child of node.children || []) {
      columns.push(...this.extractWhereColumns(child));
    }
    return columns;
  }

  private collectColumns(node: ASTNode, columns: string[]): void {
    if (node.type === 'ColumnRef' && node.value) {
      const parts = node.value.split('.');
      columns.push(parts[parts.length - 1]);
    }
    for (const child of node.children || []) {
      this.collectColumns(child, columns);
    }
  }
}
