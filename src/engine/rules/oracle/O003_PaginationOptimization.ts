import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class O003_PaginationOptimization extends Rule {
  id = 'O003';
  name = '分页查询优化';
  description = '避免使用大偏移量的 OFFSET，建议基于游标分页';
  severity = 'warning';
  dialects = ['oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitSelectStatement(ast, issues);
    return issues;
  }

  private visitSelectStatement(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'SelectStatement') {
      const hasOrderBy = (node.children || []).some(c => c.type === 'OrderByClause');
      const hasRowNum = this.checkRowNum(node);
      const hasOffset = node.properties?.offset;
      
      if (hasOffset && typeof hasOffset === 'number' && hasOffset > 1000) {
        issues.push(
          this.createIssue(
            '分页偏移量过大',
            `OFFSET ${hasOffset} 会导致数据库扫描大量数据然后丢弃，性能随偏移量增大而下降`,
            node.location || { line: 1, column: 1 },
            '使用基于游标的分页替代 OFFSET，例如：WHERE id > last_id ORDER BY id FETCH FIRST 20 ROWS ONLY'
          )
        );
      }

      if (hasRowNum && hasOrderBy) {
        issues.push(
          this.createIssue(
            'ROWNUM 分页可能效率低下',
            '使用 ROWNUM 进行分页查询时，如果数据量大且偏移量高，性能会下降',
            node.location || { line: 1, column: 1 },
            '考虑使用 ROW_NUMBER() OVER() 窗口函数或基于索引的分页方式'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitSelectStatement(child, issues);
    }
  }

  private checkRowNum(node: ASTNode): boolean {
    if (node.type === 'ColumnRef' && node.value?.toUpperCase() === 'ROWNUM') {
      return true;
    }
    for (const child of node.children || []) {
      if (this.checkRowNum(child)) return true;
    }
    return false;
  }
}
