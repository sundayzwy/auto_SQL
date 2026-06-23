import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * I004 - 使用合适的 JOIN 类型
 *
 * Impala 专用规则。检测 LEFT JOIN 和 RIGHT JOIN 的使用。外连接（OUTER JOIN）
 * 会保留所有左/右表数据，可能导致结果集膨胀，性能通常不如内连接（INNER JOIN）。
 * 该规则建议在不需要保留所有行的情况下，优先使用 INNER JOIN，
 * 并提示可以使用 BROADCAST 或 SHUFFLE hint 进一步优化。
 */
export class I004_JoinType extends Rule {
  id = 'I004';
  name = '使用合适的 JOIN 类型';
  description = '根据表大小和 JOIN 场景选择合适的 JOIN 类型和 hint';
  severity = 'info' as const;
  dialects = ['impala'] as const;

  /**
   * 分析 AST，检查 LEFT/RIGHT JOIN 的使用情况
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的 JOIN 类型优化建议问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitJoinClauses(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 JoinClause 节点，检查是否为 LEFT 或 RIGHT JOIN
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitJoinClauses(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'JoinClause') {
      const joinType = node.properties?.joinType;
      
      if (joinType === 'LEFT' || joinType === 'RIGHT') {
        issues.push(
          this.createIssue(
            `使用了 ${joinType} JOIN`,
            `${joinType} JOIN 会保留所有左/右表数据，可能导致数据量膨胀`,
            node.location || { line: 1, column: 1 },
            '确认是否真的需要 OUTER JOIN，如果可以使用 INNER JOIN 替代，性能会更好。也可以考虑使用 [BROADCAST] 或 [SHUFFLE] hint 优化'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitJoinClauses(child, issues);
    }
  }
}
