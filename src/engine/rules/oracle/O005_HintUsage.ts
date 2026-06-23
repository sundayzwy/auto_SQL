import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * O005 - Oracle Hint 使用建议
 *
 * Oracle 专用规则。检测多表 JOIN 查询中是否使用了 Oracle Hint 来指导优化器。
 * Oracle Hint（如 /*+ LEADING *​/、/*+ USE_NL *​/、/*+ INDEX *​/）可以让
 * 开发者手动控制执行计划，在多表 JOIN 场景下可能显著提升性能。
 * 该规则在检测到多表 JOIN 但没有使用 Hint 时，建议考虑添加合适的 Hint。
 */
export class O005_HintUsage extends Rule {
  id = 'O005';
  name = '提示 Hint 使用';
  description = '在特定场景下可以使用 Oracle Hint 来优化查询性能';
  severity = 'info' as const;
  dialects = ['oracle'] as const;

  /**
   * 分析 AST，检查多表 JOIN 查询是否使用了 Oracle Hint
   *
   * 如果没有表元数据，跳过分析。
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据映射
   * @returns 检测到的 Hint 使用建议问题列表
   */
  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    this.visitSelectStatement(ast, issues, metadata);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 SelectStatement 节点，检查是否为多表 JOIN 且未使用 Hint
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   * @param metadata - 表元数据映射
   */
  private visitSelectStatement(node: ASTNode, issues: Issue[], metadata: Map<string, TableMetadata>): void {
    if (node.type === 'SelectStatement') {
      const tables = this.extractTables(node);
      const hasJoins = (node.children || []).some(c => 
        c.type === 'FromClause' && (c.children || []).some(cc => cc.type === 'JoinClause')
      );

      if (hasJoins && tables.length >= 2) {
        const hasHint = this.checkHint(node);
        if (!hasHint) {
          issues.push(
            this.createIssue(
              '可以考虑使用 Hint 优化',
              '多表 JOIN 查询中可以使用 Hint 指导优化器选择更优的执行计划',
              node.location || { line: 1, column: 1 },
              '根据场景考虑使用 Hint，例如：/*+ LEADING(table1 table2) */、/*+ USE_NL(table1 table2) */、/*+ INDEX(table idx_name) */'
            )
          );
        }
      }
    }

    for (const child of node.children || []) {
      this.visitSelectStatement(child, issues, metadata);
    }
  }

  /**
   * 从 AST 中提取所有表引用名称
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

  /**
   * 检查节点对应的 SQL 文本中是否包含 Oracle Hint 标记
   *
   * @param node - 当前 AST 节点
   * @returns 是否包含 Hint
   */
  private checkHint(node: ASTNode): boolean {
    const sql = this.nodeToString(node);
    return sql.includes('/*+') || sql.includes('HINT');
  }

  /**
   * 将 AST 节点递归转换为字符串形式，用于检查是否包含 Hint 标记
   *
   * @param node - 当前 AST 节点
   * @returns 节点对应的字符串表示
   */
  private nodeToString(node: ASTNode): string {
    let result = node.value || '';
    for (const child of node.children || []) {
      result += ' ' + this.nodeToString(child);
    }
    return result;
  }
}
