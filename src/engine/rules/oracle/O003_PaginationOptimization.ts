import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * O003 - 分页查询优化
 *
 * Oracle 专用规则。检测大偏移量分页查询（OFFSET > 1000）和 ROWNUM 分页的使用。
 * 大偏移量的 OFFSET 会导致数据库扫描大量数据后丢弃，性能随偏移量增加而
 * 线性下降。ROWNUM 分页在大数据量和高偏移量场景下效率也较低。
 * 该规则建议使用基于游标（WHERE id > last_id）的分页方式替代。
 */
export class O003_PaginationOptimization extends Rule {
  id = 'O003';
  name = '分页查询优化';
  description = '避免使用大偏移量的 OFFSET，建议基于游标分页';
  severity = 'warning' as const;
  dialects = ['oracle'] as const;

  /**
   * 分析 AST，检查分页查询是否存在性能问题
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的分页优化建议问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitSelectStatement(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 SelectStatement 节点，检查 OFFSET 和 ROWNUM 分页
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
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

  /**
   * 递归检查节点及其子节点中是否引用了 ROWNUM
   *
   * @param node - 当前 AST 节点
   * @returns 是否存在 ROWNUM 引用
   */
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
