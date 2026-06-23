import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

/**
 * R007 - 避免隐式类型转换
 *
 * 检测 JOIN 或 WHERE 条件中字段类型与比较值类型不一致的情况。
 * 隐式类型转换可能导致数据库无法使用索引，从而引发全表扫描。
 * 该规则需要表元数据支持，通过对比字段声明的类型与字面值的类型来判断
 * 是否存在类型不匹配风险。该规则适用于 Impala 和 Oracle 两种方言。
 */
export class R007_AvoidImplicitConversion extends Rule {
  id = 'R007';
  name = '避免隐式类型转换';
  description = 'JOIN 或 WHERE 中字段类型不一致会导致隐式类型转换，可能使索引失效';
  severity = 'warning' as const;
  dialects = ['impala', 'oracle'] as const;

  /**
   * 分析 AST，检测条件表达式中的隐式类型转换风险
   *
   * 如果未提供表元数据，则跳过分析，因为无法判断字段类型。
   *
   * @param ast - 抽象语法树根节点
   * @param metadata - 表元数据映射，用于获取字段类型信息
   * @returns 检测到的隐式类型转换问题列表
   */
  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    this.visitConditions(ast, issues, metadata);
    return issues;
  }

  /**
   * 递归遍历 AST 中的 Condition 节点，比较字段类型与字面值类型是否匹配
   *
   * @param node - 当前 AST 节点
   * @param issues - 累积的问题列表
   * @param metadata - 表元数据映射
   */
  private visitConditions(node: ASTNode, issues: Issue[], metadata: Map<string, TableMetadata>): void {
    if (node.type === 'Condition') {
      const operator = node.properties?.operator;
      if (['=', '<', '>', '<=', '>=', '<>', '!='].includes(operator)) {
        const left = (node.children || [])[0];
        const right = (node.children || [])[1];
        
        if (left && right && left.type === 'ColumnRef' && right.type === 'Literal') {
          const colName = left.value || '';
          const literalValue = right.value || '';
          
          const colType = this.getColumnType(colName, metadata);
          if (colType && !this.isTypeMatch(colType, literalValue)) {
            issues.push(
              this.createIssue(
                '可能存在隐式类型转换',
                `字段 ${colName} 的类型为 ${colType}，但比较值的类型可能不匹配`,
                node.location || { line: 1, column: 1 },
                '确保比较值的类型与字段类型一致，必要时使用 CAST 显式转换'
              )
            );
          }
        }
      }
    }

    for (const child of node.children || []) {
      this.visitConditions(child, issues, metadata);
    }
  }

  /**
   * 从表元数据中查找指定字段的类型
   *
   * @param colName - 字段名（可能带表前缀）
   * @param metadata - 表元数据映射
   * @returns 字段类型字符串，如果未找到则返回 null
   */
  private getColumnType(colName: string, metadata: Map<string, TableMetadata>): string | null {
    const parts = colName.split('.');
    const fieldName = parts[parts.length - 1];
    
    for (const table of metadata.values()) {
      const col = table.columns.find(c => c.name.toLowerCase() === fieldName.toLowerCase());
      if (col) {
        return col.type;
      }
    }
    
    return null;
  }

  /**
   * 判断字面值类型是否与字段声明的类型匹配
   *
   * @param colType - 字段声明的类型
   * @param literalValue - 字面值
   * @returns 类型是否匹配
   */
  private isTypeMatch(colType: string, literalValue: string): boolean {
    const upperType = colType.toUpperCase();
    
    if (upperType.includes('INT') || upperType === 'NUMBER' || upperType === 'DECIMAL') {
      return /^-?\d+$/.test(literalValue.replace(/'/g, ''));
    }
    
    if (upperType.includes('STRING') || upperType.includes('CHAR') || upperType.includes('TEXT')) {
      return literalValue.startsWith("'") || literalValue.startsWith('"');
    }
    
    return true;
  }
}
