import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * I002 - JOIN 顺序优化
 *
 * Impala 专用规则。在 Impala 中，JOIN 的顺序会影响 Broadcast Join 的
 * 性能。通常建议将大表放在 JOIN 的左边（作为驱动表），小表放在右边
 * （被广播到所有节点）。该规则通过比较表的字段数量来粗略判断表的大小，
 * 并建议调整 JOIN 顺序。
 */
export class I002_JoinOrder extends Rule {
  id = 'I002';
  name = 'JOIN 顺序优化';
  description = '在 Impala 中，大表应放在 JOIN 的左边，小表放在右边，以优化 Broadcast Join';
  severity = 'info' as const;
  dialects = ['impala'] as const;

  /**
   * 分析 AST，检查 JOIN 顺序是否需要调整
   *
   * 如果没有表元数据，跳过分析。
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据映射，用于比较表大小
   * @returns 检测到的 JOIN 顺序优化建议问题列表
   */
  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    this.visitJoinClauses(ast, issues, metadata);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 JoinClause 节点，比较左右表大小并给出优化建议
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   * @param metadata - 表元数据映射
   */
  private visitJoinClauses(node: ASTNode, issues: Issue[], metadata: Map<string, TableMetadata>): void {
    if (node.type === 'JoinClause') {
      const tables = this.extractTables(node);
      if (tables.length >= 2) {
        const leftTable = tables[0];
        const rightTable = tables[1];
        
        const leftMeta = metadata.get(leftTable.toLowerCase());
        const rightMeta = metadata.get(rightTable.toLowerCase());
        
        if (leftMeta && rightMeta) {
          const leftCols = leftMeta.columns.length;
          const rightCols = rightMeta.columns.length;
          
          if (leftCols < rightCols) {
            issues.push(
              this.createIssue(
                'JOIN 顺序可能需要调整',
                `建议将较大的表 ${rightTable} 放在左边，较小的表 ${leftTable} 放在右边，以优化 Broadcast Join`,
                node.location || { line: 1, column: 1 },
                '调整 JOIN 顺序，将大表放在左边，小表放在右边，或使用 [SHUFFLE] hint'
              )
            );
          }
        }
      }
    }

    for (const child of node.children || []) {
      this.visitJoinClauses(child, issues, metadata);
    }
  }

  /**
   * 从 AST 节点中提取所有表引用名称
   *
   * @param node - 当前 AST 节点
   * @returns 表名列表
   */
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
