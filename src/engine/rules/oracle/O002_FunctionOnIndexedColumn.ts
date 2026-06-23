import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * O002 - 避免函数包裹索引字段
 *
 * Oracle 专用规则。检测在 WHERE 条件中是否对已建立索引的字段使用了函数。
 * 当对索引字段使用函数时（如 UPPER(name)、TO_CHAR(date_col)），Oracle
 * 无法使用该字段上的普通 B-Tree 索引，会导致索引失效和全表扫描。
 * 该规则建议创建函数索引或改写查询以避免在字段上使用函数。
 */
export class O002_FunctionOnIndexedColumn extends Rule {
  id = 'O002';
  name = '避免函数包裹索引字段';
  description = '在 WHERE 条件中对索引字段使用函数会导致索引失效';
  severity = 'warning' as const;
  dialects = ['oracle'] as const;

  private readonly functions = new Set([
    'UPPER', 'LOWER', 'TRIM', 'SUBSTR', 'SUBSTRING',
    'TO_CHAR', 'TO_DATE', 'TO_NUMBER',
    'NVL', 'DECODE', 'CAST', 'CONVERT',
  ]);

  /**
   * 分析 AST，检查 WHERE 条件中是否对已索引字段使用了函数
   *
   * 如果没有表元数据或没有 WHERE 子句，跳过分析。
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据映射，包含索引信息
   * @returns 检测到的函数包裹索引字段问题列表
   */
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

  /**
   * 在 AST 中查找 WHERE 子句节点
   *
   * @param node - 当前 AST 节点
   * @returns WHERE 子句节点，如果未找到则返回 null
   */
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

  /**
   * 递归检查表达式节点，识别函数调用是否包裹了已索引字段
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   * @param metadata - 表元数据映射
   */
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

  /**
   * 检查指定字段是否在元数据中存在索引
   *
   * @param colName - 字段名
   * @param metadata - 表元数据映射
   * @returns 是否存在索引
   */
  private checkIndex(colName: string, metadata: Map<string, TableMetadata>): boolean {
    for (const table of metadata.values()) {
      const hasIndex = table.indexes?.some((idx: { columns: string[] }) => 
        idx.columns.some((c: string) => c.toLowerCase() === colName.toLowerCase())
      );
      if (hasIndex) return true;
    }
    return false;
  }
}
