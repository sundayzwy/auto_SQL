import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * I005 - COUNT(DISTINCT) 优化
 *
 * Impala 专用规则。检测 COUNT(DISTINCT column) 的使用。在大数据量场景下，
 * COUNT(DISTINCT) 需要将所有数据发送到同一个节点进行去重操作，容易导致
 * 数据倾斜和性能瓶颈。该规则建议将 COUNT(DISTINCT) 改写为两层聚合：
 * 先通过 GROUP BY 去重，再使用 COUNT 统计。
 */
export class I005_CountDistinct extends Rule {
  id = 'I005';
  name = 'COUNT(DISTINCT) 优化';
  description = '大数据量时 COUNT(DISTINCT) 会导致数据倾斜，建议改写为 GROUP BY + COUNT';
  severity = 'warning' as const;
  dialects = ['impala'] as const;

  /**
   * 分析 AST，查找 COUNT(DISTINCT) 函数调用
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据（本规则未使用）
   * @returns 检测到的 COUNT(DISTINCT) 优化建议问题列表
   */
  analyze(ast: ASTNode, _metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    this.visitFunctionCalls(ast, issues);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 FunctionCall 节点，检查是否为 COUNT(DISTINCT)
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   */
  private visitFunctionCalls(node: ASTNode, issues: Issue[]): void {
    if (node.type === 'FunctionCall') {
      const funcName = (node.properties?.functionName || '').toUpperCase();
      const isDistinct = node.properties?.distinct;
      
      if (funcName === 'COUNT' && isDistinct) {
        issues.push(
          this.createIssue(
            '使用了 COUNT(DISTINCT)',
            'COUNT(DISTINCT) 在大数据量时会导致数据倾斜，所有数据需要发送到同一个节点去重',
            node.location || { line: 1, column: 1 },
            '考虑改写为两层聚合：先 GROUP BY 去重，再 COUNT。例如：SELECT COUNT(*) FROM (SELECT DISTINCT col FROM table) t'
          )
        );
      }
    }

    for (const child of node.children || []) {
      this.visitFunctionCalls(child, issues);
    }
  }
}
