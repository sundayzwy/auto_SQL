import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * O001 - 索引使用检测
 *
 * Oracle 专用规则。检测 WHERE 条件中使用的字段是否缺少索引。当查询
 * 的过滤条件中涉及未创建索引的字段时，Oracle 只能执行全表扫描，
 * 在大数据量场景下性能会急剧下降。该规则通过表元数据中的索引信息
 * 来判断 WHERE 条件中的字段是否已被索引覆盖。
 */
export class O001_IndexUsage extends Rule {
  id = 'O001';
  name = '索引使用检测';
  description = 'WHERE 条件中的字段如果没有索引，会导致全表扫描';
  severity = 'warning' as const;
  dialects = ['oracle'] as const;

  /**
   * 分析 AST，检查 WHERE 条件中的字段是否缺少索引
   *
   * 如果没有表元数据或没有 WHERE 子句，跳过分析。
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据映射，包含索引信息
   * @returns 检测到的索引缺失问题列表
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

    const tables = this.extractTables(ast);
    const whereColumns = this.extractWhereColumns(whereClause);

    for (const table of tables) {
      const tableMeta = metadata.get(table.toLowerCase());
      if (tableMeta) {
        for (const col of whereColumns) {
          const hasIndex = tableMeta.indexes?.some((idx: { columns: string[] }) => 
            idx.columns.some((c: string) => c.toLowerCase() === col.toLowerCase())
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
   * 从 WHERE 子句节点中提取所有使用的字段名
   *
   * @param node - WHERE 子句 AST 节点
   * @returns WHERE 条件中使用的字段名列表
   */
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
