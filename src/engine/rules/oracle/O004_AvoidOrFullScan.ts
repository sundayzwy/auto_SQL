import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * O004 - 避免 OR 导致全表扫描
 *
 * Oracle 专用规则。检测 WHERE 条件中使用 OR 连接多个不同字段的情况。
 * 当 OR 条件涉及多个不同的字段时，Oracle 的优化器可能无法有效利用
 * 单列索引，转而选择全表扫描。该规则建议将 OR 改写为 UNION ALL，
 * 或者创建包含这些字段的复合索引。
 */
export class O004_AvoidOrFullScan extends Rule {
  id = 'O004';
  name = '避免 OR 导致全表扫描';
  description = 'OR 条件可能导致索引失效，建议改写为 UNION 或使用复合索引';
  severity = 'warning' as const;
  dialects = ['oracle'] as const;

  /**
   * 分析 AST，检查 WHERE 条件中的 OR 是否可能导致全表扫描
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的 OR 全表扫描风险问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitWhereClause(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST，定位 WhereClause 节点并对其中 OR 条件进行检查
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitWhereClause(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'WhereClause') {
      this.checkOrConditions(node, issues);
    }

    for (const child of node.children || []) {
      this.visitWhereClause(child, issues);
    }
  }

  /**
   * 递归检查表达式节点，识别 OR 操作符是否涉及多个不同字段
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
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

  /**
   * 从节点中提取所有 ColumnRef 字段名
   *
   * @param node - 当前 AST 节点
   * @returns 字段名列表
   */
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
