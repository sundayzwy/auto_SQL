import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class I006_ComputeStats extends Rule {
  id = 'I006';
  name = '统计信息缺失';
  description = '大表应定期执行 COMPUTE STATS 以更新统计信息，帮助优化器生成更优的执行计划';
  severity = 'info';
  dialects = ['impala'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    const tables = this.extractTables(ast);
    
    for (const table of tables) {
      const tableMeta = metadata.get(table.toLowerCase());
      if (tableMeta) {
        const colCount = tableMeta.columns.length;
        if (colCount > 10) {
          issues.push(
            this.createIssue(
              `表 ${table} 可能需要更新统计信息`,
              `表 ${table} 有 ${colCount} 个字段，建议定期执行 COMPUTE STATS 以更新统计信息`,
              ast.location || { line: 1, column: 1 },
              `执行 COMPUTE STATS ${table} 以更新统计信息，帮助优化器生成更优的执行计划`
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
}
