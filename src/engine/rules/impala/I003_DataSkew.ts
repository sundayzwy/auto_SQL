import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * I003 - 数据倾斜检测
 *
 * Impala 专用规则。检测 JOIN 键是否存在数据倾斜风险。当 JOIN 键的
 * 数据分布不均匀时，会导致某些节点处理的数据量远超其他节点，造成
 * 整体查询性能下降。该规则对每个 JOIN 子句的 ON 条件中的字段进行
 * 检查，提示可能存在数据倾斜的风险。
 */
export class I003_DataSkew extends Rule {
  id = 'I003';
  name = '避免数据倾斜';
  description = 'JOIN 键可能存在数据倾斜风险，导致某些节点处理数据量过大';
  severity = 'warning' as const;
  dialects = ['impala'] as const;

  /**
   * 分析 AST，检查 JOIN 键是否存在数据倾斜风险
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的数据倾斜风险问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitJoinClauses(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 JoinClause 节点，提取 JOIN 键并检查数据倾斜风险
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitJoinClauses(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'JoinClause') {
      const joinType = node.properties?.joinType;
      
      if (joinType !== 'CROSS') {
        const onCondition = (node.children || [])[1];
        if (onCondition) {
          const joinColumns = this.extractJoinColumns(onCondition);
          
          if (joinColumns.length > 0) {
            issues.push(
              this.createIssue(
                '可能存在数据倾斜风险',
                `JOIN 键 ${joinColumns.join(', ')} 可能存在数据分布不均匀的情况`,
                node.location || { line: 1, column: 1 },
                '检查 JOIN 键的数据分布，如果存在倾斜，可以考虑使用 [SHUFFLE] hint 或添加随机前缀打散数据'
              )
            );
          }
        }
      }
    }

    for (const child of node.children || []) {
      this.visitJoinClauses(child, issues);
    }
  }

  /**
   * 从 ON 条件节点中提取所有 JOIN 关联字段名
   *
   * @param node - ON 条件 AST 节点
   * @returns JOIN 字段名列表
   */
  private extractJoinColumns(node: ASTNode): string[] {
    const columns: string[] = [];
    if (node.type === 'ColumnRef' && node.value) {
      columns.push(node.value);
    }
    for (const child of node.children || []) {
      columns.push(...this.extractJoinColumns(child));
    }
    return columns;
  }
}
