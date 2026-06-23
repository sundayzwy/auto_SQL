import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * R008 - EXISTS 替代 IN（子查询）
 *
 * 检测使用 IN + 子查询的场景。当子查询涉及大表时，IN 操作可能导致
 * 性能问题，因为数据库需要先执行子查询获取完整结果集，再与外部查询
 * 进行匹配。EXISTS 通常可以提前终止扫描，在处理大数据量时效率更高。
 * 该规则适用于 Impala 和 Oracle 两种方言。
 */
export class R008_ExistsInsteadofIn extends Rule {
  id = 'R008';
  name = 'EXISTS 替代 IN (子查询)';
  description = '大表场景下 EXISTS 通常比 IN (子查询) 更高效';
  severity = 'info' as const;
  dialects = ['impala', 'oracle'] as const;

  /**
   * 分析 AST，遍历查找 IN + 子查询的使用场景
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的 IN 子查询可优化问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitConditions(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 Condition 节点，检查 operator 为 IN 且包含子查询的情况
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitConditions(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'Condition' && node.properties?.operator === 'IN') {
      const hasSubquery = (node.children || []).some(c => c.type === 'Subquery');
      if (hasSubquery) {
        issues.push(
          this.createIssue(
            'IN (子查询) 可考虑改写为 EXISTS',
            '大表场景下 EXISTS 通常比 IN (子查询) 更高效',
            node.location || { line: 1, column: 1 },
            '将 IN (SELECT ...) 改写为 EXISTS (SELECT 1 FROM ... WHERE ...)'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitConditions(child, issues);
    }
  }
}
