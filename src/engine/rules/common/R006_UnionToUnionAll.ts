import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * R006 - UNION 改写为 UNION ALL
 *
 * 检测 SQL 中使用 UNION 的情况。UNION 会对结果集进行去重操作（相当于
 * UNION ALL + DISTINCT），消耗额外的 CPU 和内存资源。如果业务逻辑
 * 不需要去重，应使用 UNION ALL 以获得更好的性能。该规则适用于
 * Impala 和 Oracle 两种方言。
 */
export class R006_UnionToUnionAll extends Rule {
  id = 'R006';
  name = 'UNION 改写为 UNION ALL';
  description = 'UNION 会进行去重操作，如果不需要去重，应使用 UNION ALL 以提升性能';
  severity = 'info' as const;
  dialects = ['impala', 'oracle'] as const;

  /**
   * 分析 AST，遍历查找 UNION 操作符的使用
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的 UNION 使用问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitUnion(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST，查找 operator 为 UNION 的 Expression 节点
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitUnion(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'Expression' && node.properties?.operator === 'UNION') {
      issues.push(
        this.createIssue(
          '使用了 UNION',
          'UNION 会进行去重操作，消耗额外的 CPU 和内存资源',
          node.location || { line: 1, column: 1 },
          '如果不需要去重，请改用 UNION ALL，性能会显著提升'
        )
      );
    }

    for (const child of node.children || []) {
      this.visitUnion(child, issues);
    }
  }
}
