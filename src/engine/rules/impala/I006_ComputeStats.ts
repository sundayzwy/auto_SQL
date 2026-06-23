import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * I006 - 统计信息更新建议
 *
 * Impala 专用规则。检测大表是否需要执行 COMPUTE STATS 更新统计信息。
 * Impala 的查询优化器依赖表的统计信息（如行数、列基数等）来生成
 * 最优的执行计划。如果统计信息过时或缺失，可能导致优化器选择次优的
 * 执行策略。该规则建议对字段数较多（>10 列）的表定期执行 COMPUTE STATS。
 */
export class I006_ComputeStats extends Rule {
  id = 'I006';
  name = '统计信息缺失';
  description = '大表应定期执行 COMPUTE STATS 以更新统计信息，帮助优化器生成更优的执行计划';
  severity = 'info' as const;
  dialects = ['impala'] as const;

  /**
   * 分析 AST，检查大表是否需要更新统计信息
   *
   * 如果没有表元数据，跳过分析。
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据映射，用于获取表的字段信息
   * @returns 检测到的统计信息更新建议问题列表
   */
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
}
