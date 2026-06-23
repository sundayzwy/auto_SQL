import { ASTNode, Issue, TableMetadata } from '../../shared/types';

/**
 * 抽象规则基类
 *
 * 所有 SQL 优化规则均继承自此类。每条规则需要定义其唯一标识、名称、描述、
 * 严重级别以及适用的 SQL 方言。子类通过实现 analyze 方法提供具体的 AST
 * 分析逻辑，通过 createIssue 辅助方法创建符合规范的问题报告。
 */
export abstract class Rule {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract severity: 'error' | 'warning' | 'info';
  abstract dialects: readonly ('impala' | 'oracle')[];

  /**
   * 分析 AST 节点，检测 SQL 语句中的问题
   *
   * @param ast - 待分析的抽象语法树根节点
   * @param metadata - 可选的表元数据映射，包含表结构、分区键、索引等信息
   * @returns 检测到的问题列表，每个问题包含规则 ID、严重级别、定位信息和优化建议
   */
  abstract analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[];

  /**
   * 创建问题报告实例
   *
   * 提供统一的 Issue 对象构造方式，自动填充规则 ID 和严重级别。
   * 子类应使用此方法生成问题报告，以确保返回格式的一致性。
   *
   * @param title - 问题标题，简要概括问题类型
   * @param description - 问题的详细描述
   * @param location - 问题在 SQL 中的位置信息（行号、列号等）
   * @param suggestion - 优化建议
   * @param optimizedSql - 可选的优化后的 SQL 语句
   * @returns 符合 Issue 接口的问题报告对象
   */
  protected createIssue(
    title: string,
    description: string,
    location: { line: number; column: number; endLine?: number; endColumn?: number },
    suggestion: string,
    optimizedSql?: string
  ): Issue {
    return {
      ruleId: this.id,
      severity: this.severity,
      title,
      description,
      location,
      suggestion,
      optimizedSql,
    };
  }
}
