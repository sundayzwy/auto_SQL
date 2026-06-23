import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * R005 - LIKE 前缀通配符检测
 *
 * 检测 LIKE 模式是否以通配符（% 或 _）开头。当前缀通配符出现在 LIKE
 * 模式的开头时（如 %abc），数据库无法利用 B-Tree 索引进行高效查找，
 * 只能执行全表扫描。该规则适用于 Impala 和 Oracle 两种方言。
 */
export class R005_LikeLeadingWildcard extends Rule {
  id = 'R005';
  name = 'LIKE 前缀通配符检测';
  description = 'LIKE 模式以通配符开头（如 %abc）无法利用索引，会导致全表扫描';
  severity = 'warning' as const;
  dialects = ['impala', 'oracle'] as const;

  /**
   * 分析 AST，遍历条件表达式检查 LIKE 模式是否以前导通配符开头
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的 LIKE 前缀通配符问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitConditions(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 Condition 节点，检查 LIKE 操作符的模式字符串
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitConditions(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'Condition' && node.properties?.operator === 'LIKE') {
      const patternNode = (node.children || [])[1];
      if (patternNode && patternNode.type === 'Literal') {
        const pattern = patternNode.value || '';
        if (pattern.startsWith("'%") || pattern.startsWith('"%')) {
          issues.push(
            this.createIssue(
              'LIKE 模式以通配符开头',
              `LIKE 模式 ${pattern} 以通配符开头，无法利用索引，会导致全表扫描`,
              node.location || { line: 1, column: 1 },
              '如果可能，使用前缀匹配（如 abc%）替代前缀通配符（如 %abc），或考虑使用全文索引'
            )
          );
        }
      }
    }

    for (const child of node.children || []) {
      this.visitConditions(child, issues);
    }
  }
}
