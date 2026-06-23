import { Rule } from '../Rule';
import { ASTNode, Issue, TableMetadata } from '../../../shared/types';

export class I002_JoinOrder extends Rule {
  id = 'I002';
  name = 'JOIN 顺序优化';
  description = '在 Impala 中，大表应放在 JOIN 的左边，小表放在右边，以优化 Broadcast Join';
  severity = 'info';
  dialects = ['impala'];

  analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];
    
    if (!metadata || metadata.size === 0) {
      return issues;
    }

    this.visitJoinClauses(ast, issues, metadata);
    return issues;
  }

  private visitJoinClauses(node: ASTNode, issues: Issue[], metadata: Map<string, TableMetadata>): void {
    if (node.type === 'JoinClause') {
      const tables = this.extractTables(node);
      if (tables.length >= 2) {
        const leftTable = tables[0];
        const rightTable = tables[1];
        
        const leftMeta = metadata.get(leftTable.toLowerCase());
        const rightMeta = metadata.get(rightTable.toLowerCase());
        
        if (leftMeta && rightMeta) {
          const leftCols = leftMeta.columns.length;
          const rightCols = rightMeta.columns.length;
          
          if (leftCols < rightCols) {
            issues.push(
              this.createIssue(
                'JOIN 顺序可能需要调整',
                `建议将较大的表 ${rightTable} 放在左边，较小的表 ${leftTable} 放在右边，以优化 Broadcast Join`,
                node.location || { line: 1, column: 1 },
                '调整 JOIN 顺序，将大表放在左边，小表放在右边，或使用 [SHUFFLE] hint'
              )
            );
          }
        }
      }
    }

    for (const child of node.children || []) {
      this.visitJoinClauses(child, issues, metadata);
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
}
