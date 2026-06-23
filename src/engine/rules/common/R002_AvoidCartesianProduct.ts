import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * R002 - 避免笛卡尔积
 *
 * 检测 JOIN 语句是否缺少 ON 条件。缺少连接条件的 JOIN（非 CROSS JOIN）
 * 会产生笛卡尔积，将左表和右表的所有行进行组合，生成大量无意义的数据，
 * 严重影响查询性能。该规则适用于 Impala 和 Oracle 两种方言。
 */
export class R002_AvoidCartesianProduct extends Rule {
  id = 'R002';
  name = '避免笛卡尔积';
  description = 'JOIN 缺少 ON 条件会导致笛卡尔积，产生大量无意义的数据组合，严重影响性能';
  severity = 'error' as const;
  dialects = ['impala', 'oracle'] as const;

  /**
   * 分析 AST，遍历所有 JoinClause 节点检查是否缺少 ON 条件
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的笛卡尔积风险问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitJoinClauses(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST，检查 JoinClause 节点是否缺少 ON 条件
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitJoinClauses(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'JoinClause') {
      const joinType = node.properties?.joinType;
      const hasOnCondition = (node.children || []).length > 1;
      
      if (joinType !== 'CROSS' && !hasOnCondition) {
        issues.push(
          this.createIssue(
            'JOIN 缺少 ON 条件',
            'JOIN 语句没有 ON 条件，可能导致笛卡尔积，产生大量无意义的数据组合',
            node.location || { line: 1, column: 1 },
            '为 JOIN 添加 ON 条件，或使用 CROSS JOIN 明确表示需要笛卡尔积'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitJoinClauses(child, issues);
    }
  }
}
