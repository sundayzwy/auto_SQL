import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class R007_AvoidImplicitConversion extends Rule {
  id = 'R007';
  name = '避免隐式类型转换';
  description = 'JOIN 或 WHERE 中字段类型不一致会导致隐式类型转换，可能使索引失效';
  severity = 'warning';
  dialects = ['impala', 'oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    this.visitConditions(ast, issues, metadata);
    return issues;
  }

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
