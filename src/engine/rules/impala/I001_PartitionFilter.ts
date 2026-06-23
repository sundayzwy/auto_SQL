import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * I001 - 分区字段过滤检测
 *
 * Impala 专用规则。检测查询分区表时是否在 WHERE 条件中包含了分区字段过滤。
 * 如果查询分区表但未对分区字段进行过滤，Impala 会扫描所有分区，导致
 * 大量不必要的 I/O 开销。该规则通过表元数据获取分区键信息，确认
 * WHERE 条件中是否包含这些分区字段。
 */
export class I001_PartitionFilter extends Rule {
  id = 'I001';
  name = '分区字段必须使用';
  description = '查询分区表时应在 WHERE 条件中包含分区字段过滤，否则会导致全分区扫描';
  severity = 'warning' as const;
  dialects = ['impala'] as const;

  /**
   * 分析 AST，检查分区表查询是否包含分区字段过滤
   *
   * 如果没有表元数据，跳过分析。
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据映射，包含分区键信息
   * @returns 检测到的分区过滤缺失问题列表
   */
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

  /**
   * 从 AST 中提取所有表引用
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
   * 从 AST 的 WHERE 子句中提取所有使用的字段名
   *
   * @param node - 当前 AST 节点
   * @returns WHERE 条件中使用的字段名列表
   */
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

  /**
   * 递归收集节点及其子节点中的所有 ColumnRef 字段名
   *
   * @param node - 当前 AST 节点
   * @param columns - 累积的字段名列表
   */
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
