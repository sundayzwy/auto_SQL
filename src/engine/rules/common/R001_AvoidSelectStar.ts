import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * R001 - 避免 SELECT *
 *
 * 检测 SQL 中使用 SELECT * 的情况。SELECT * 会查询表中所有字段，
 * 增加不必要的 I/O 和网络传输开销，建议明确指定需要的字段列表。
 * 该规则适用于 Impala 和 Oracle 两种方言。
 */
export class R001_AvoidSelectStar extends Rule {
  id = 'R001';
  name = '避免 SELECT *';
  description = '使用 SELECT * 会导致查询所有字段，增加不必要的 I/O 和网络传输，建议明确指定需要的字段';
  severity = 'warning' as const;
  dialects = ['impala', 'oracle'] as const;

  /**
   * 分析 AST，遍历查找 SELECT * 的使用
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的 SELECT * 问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitSelectList(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST 的 SelectList 节点，检查是否存在 ColumnRef 值为 '*'
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitSelectList(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'SelectList') {
      for (const child of node.children || []) {
        if (child.type === 'ColumnRef' && child.value === '*') {
          issues.push(
            this.createIssue(
              '使用了 SELECT *',
              'SELECT * 会查询所有字段，增加不必要的 I/O 和网络传输',
              child.location || { line: 1, column: 1 },
              '明确指定需要的字段，例如：SELECT id, name, age FROM table'
            )
          );
        }
      }
    }

    for (const child of node.children || []) {
      this.visitSelectList(child, issues);
    }
  }
}
