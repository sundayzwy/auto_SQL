import { ASTNode, Issue, TableMetadata } from '../../shared/types';

export abstract class Rule {
  abstract id: string;
  abstract name: string;
  abstract description: string;
  abstract severity: 'error' | 'warning' | 'info';
  abstract dialects: ('impala' | 'oracle')[];

  abstract analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[];

  protected createIssue(
    title: string,
    description: string,
    location: { line: number; column: number; endLine?: number; endColumn?: number },
    suggestion: string,
    optimizedSql?: string
  ): Issue {
    return {
      ruleId: this.id,
      severity: this.severity,
      title,
      description,
      location,
      suggestion,
      optimizedSql,
    };
  }
}
