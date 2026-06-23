import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class O005_HintUsage extends Rule {
  id = 'O005';
  name = '提示 Hint 使用';
  description = '在特定场景下可以使用 Oracle Hint 来优化查询性能';
  severity = 'info';
  dialects = ['oracle'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    this.visitSelectStatement(ast, issues, metadata);
    return issues;
  }

  private visitSelectStatement(node: ASTNode, issues: Issue[], metadata: Map<string, TableMetadata>): void {
    if (node.type === 'SelectStatement') {
      const tables = this.extractTables(node);
      const hasJoins = (node.children || []).some(c => 
        c.type === 'FromClause' && (c.children || []).some(cc => cc.type === 'JoinClause')
      );

      if (hasJoins && tables.length >= 2) {
        const hasHint = this.checkHint(node);
        if (!hasHint) {
          issues.push(
            this.createIssue(
              '可以考虑使用 Hint 优化',
              '多表 JOIN 查询中可以使用 Hint 指导优化器选择更优的执行计划',
              node.location || { line: 1, column: 1 },
              '根据场景考虑使用 Hint，例如：/*+ LEADING(table1 table2) */、/*+ USE_NL(table1 table2) */、/*+ INDEX(table idx_name) */'
            )
          );
        }
      }
    }

    for (const child of node.children || []) {
      this.visitSelectStatement(child, issues, metadata);
    }
  }

  private extractTables(node: ASTNode): string[] {
    const tables: string[] = [];
    if (node.type === 'TableRef' && node.value) {
      tables.push(node.value);
    }
    for (const child of node.children || []) {
      tables.push(...this.extractTables(child));
    }
    return tables;
  }

  private checkHint(node: ASTNode): boolean {
    const sql = this.nodeToString(node);
    return sql.includes('/*+') || sql.includes('HINT');
  }

  private nodeToString(node: ASTNode): string {
    let result = node.value || '';
    for (const child of node.children || []) {
      result += ' ' + this.nodeToString(child);
    }
    return result;
  }
}
