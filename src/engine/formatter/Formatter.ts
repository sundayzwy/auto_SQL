import { ASTNode, FormatConfig, FormatResult, SqlDialect } from '../shared/types';
import { Parser } from '../parser/Parser';

export class Formatter {
  private config: FormatConfig;
  private indent: number = 0;
  private dialect: SqlDialect = 'impala';

  constructor(config: FormatConfig) {
    this.config = config;
  }

  format(sql: string, dialect: SqlDialect = 'impala'): FormatResult {
    this.dialect = dialect;
    this.indent = 0;

    const parser = new Parser();
    const parseResult = parser.parse(sql, dialect);

    if (!parseResult.success || !parseResult.ast) {
      return {
        success: false,
        errors: parseResult.errors,
      };
    }

    try {
      const formattedSql = this.formatNode(parseResult.ast);
      return {
        success: true,
        formattedSql,
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Format error',
          location: { line: 1, column: 1 },
        }],
      };
    }
  }

  private formatNode(node: ASTNode): string {
    switch (node.type) {
      case 'SelectStatement':
        return this.formatSelectStatement(node);
      case 'InsertStatement':
        return this.formatInsertStatement(node);
      case 'CreateTableStatement':
        return this.formatCreateTableStatement(node);
      case 'FromClause':
        return this.formatFromClause(node);
      case 'WhereClause':
        return this.formatWhereClause(node);
      case 'JoinClause':
        return this.formatJoinClause(node);
      case 'GroupByClause':
        return this.formatGroupByClause(node);
      case 'OrderByClause':
        return this.formatOrderByClause(node);
      case 'HavingClause':
        return this.formatHavingClause(node);
      case 'SelectList':
        return this.formatSelectList(node);
      case 'Expression':
        return this.formatExpression(node);
      case 'Condition':
        return this.formatCondition(node);
      case 'FunctionCall':
        return this.formatFunctionCall(node);
      case 'ColumnRef':
        return node.value || '';
      case 'TableRef':
        return this.formatTableRef(node);
      case 'Subquery':
        return this.formatSubquery(node);
      case 'Literal':
        return node.value || '';
      default:
        return '';
    }
  }

  private formatSelectStatement(node: ASTNode): string {
    const lines: string[] = [];
    
    // SELECT
    let selectKeyword = this.formatKeyword('SELECT');
    if (node.properties?.distinct) {
      selectKeyword += ' ' + this.formatKeyword('DISTINCT');
    }
    lines.push(selectKeyword);

    // Select list
    if (node.children && node.children.length > 0) {
      const selectList = node.children[0];
      if (selectList.type === 'SelectList') {
        const formattedList = this.formatSelectList(selectList);
        lines.push(this.indentText(formattedList));
      }
    }

    // FROM
    const fromClause = node.children?.find(c => c.type === 'FromClause');
    if (fromClause) {
      lines.push(this.formatKeyword('FROM'));
      lines.push(this.indentText(this.formatFromClause(fromClause)));
    }

    // WHERE
    const whereClause = node.children?.find(c => c.type === 'WhereClause');
    if (whereClause) {
      lines.push(this.formatKeyword('WHERE'));
      lines.push(this.indentText(this.formatWhereClause(whereClause)));
    }

    // GROUP BY
    const groupByClause = node.children?.find(c => c.type === 'GroupByClause');
    if (groupByClause) {
      lines.push(this.formatKeyword('GROUP BY'));
      lines.push(this.indentText(this.formatGroupByClause(groupByClause)));
    }

    // HAVING
    const havingClause = node.children?.find(c => c.type === 'HavingClause');
    if (havingClause) {
      lines.push(this.formatKeyword('HAVING'));
      lines.push(this.indentText(this.formatHavingClause(havingClause)));
    }

    // ORDER BY
    const orderByClause = node.children?.find(c => c.type === 'OrderByClause');
    if (orderByClause) {
      lines.push(this.formatKeyword('ORDER BY'));
      lines.push(this.indentText(this.formatOrderByClause(orderByClause)));
    }

    // LIMIT
    if (node.properties?.limit) {
      lines.push(this.formatKeyword('LIMIT'));
      lines.push(this.indentText(this.formatNode(node.properties.limit)));
    }

    return lines.join('\n');
  }

  private formatSelectList(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }

    const items = node.children.map(child => {
      let formatted = this.formatNode(child);
      if (child.properties?.alias) {
        formatted += ' ' + this.formatKeyword('AS') + ' ' + child.properties.alias;
      }
      return formatted;
    });

    if (this.config.fieldListStyle === 'each-line') {
      return items.join(',\n');
    } else {
      return items.join(', ');
    }
  }

  private formatFromClause(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }

    const parts: string[] = [];
    
    for (const child of node.children) {
      if (child.type === 'TableRef' || child.type === 'Subquery') {
        parts.push(this.formatNode(child));
      } else if (child.type === 'JoinClause') {
        parts.push(this.formatJoinClause(child));
      }
    }

    return parts.join('\n');
  }

  private formatTableRef(node: ASTNode): string {
    let result = node.value || '';
    if (node.properties?.alias) {
      result += ' ' + this.formatKeyword('AS') + ' ' + node.properties.alias;
    }
    return result;
  }

  private formatJoinClause(node: ASTNode): string {
    const joinType = node.properties?.joinType || 'INNER';
    let result = '';

    if (joinType === 'CROSS') {
      result = this.formatKeyword('CROSS JOIN');
    } else if (joinType === 'INNER') {
      result = this.formatKeyword('JOIN');
    } else {
      result = this.formatKeyword(`${joinType} JOIN`);
    }

    if (node.children && node.children.length > 0) {
      result += ' ' + this.formatNode(node.children[0]);
      
      if (node.children.length > 1) {
        result += '\n' + this.formatKeyword('ON') + ' ' + this.formatNode(node.children[1]);
      }
    }

    return result;
  }

  private formatWhereClause(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }
    return this.formatNode(node.children[0]);
  }

  private formatGroupByClause(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }

    const items = node.children.map(child => this.formatNode(child));
    
    if (this.config.fieldListStyle === 'each-line') {
      return items.join(',\n');
    } else {
      return items.join(', ');
    }
  }

  private formatOrderByClause(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }

    const items = node.children.map(child => {
      let formatted = this.formatNode(child);
      if (child.properties?.order) {
        formatted += ' ' + this.formatKeyword(child.properties.order);
      }
      return formatted;
    });

    if (this.config.fieldListStyle === 'each-line') {
      return items.join(',\n');
    } else {
      return items.join(', ');
    }
  }

  private formatHavingClause(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }
    return this.formatNode(node.children[0]);
  }

  private formatExpression(node: ASTNode): string {
    const operator = node.properties?.operator;
    
    if (!operator) {
      return '';
    }

    if (operator === 'NOT' && node.children && node.children.length > 0) {
      return this.formatKeyword('NOT') + ' ' + this.formatNode(node.children[0]);
    }

    if (node.children && node.children.length === 2) {
      const left = this.formatNode(node.children[0]);
      const right = this.formatNode(node.children[1]);
      
      if (['AND', 'OR'].includes(operator)) {
        if (this.config.whereClauseStyle === 'each-line') {
          return `${left}\n${this.formatKeyword(operator)} ${right}`;
        } else {
          return `${left} ${this.formatKeyword(operator)} ${right}`;
        }
      }
      
      return `${left} ${operator} ${right}`;
    }

    return '';
  }

  private formatCondition(node: ASTNode): string {
    const operator = node.properties?.operator;
    
    if (!node.children || node.children.length === 0) {
      return '';
    }

    if (operator === 'IS NULL' || operator === 'IS NOT NULL') {
      return `${this.formatNode(node.children[0])} ${this.formatKeyword(operator)}`;
    }

    if (operator === 'IN' && node.children.length > 1) {
      const left = this.formatNode(node.children[0]);
      const values = node.children.slice(1).map(c => this.formatNode(c)).join(', ');
      return `${left} ${this.formatKeyword('IN')} (${values})`;
    }

    if (operator === 'BETWEEN' && node.children.length === 3) {
      const expr = this.formatNode(node.children[0]);
      const low = this.formatNode(node.children[1]);
      const high = this.formatNode(node.children[2]);
      return `${expr} ${this.formatKeyword('BETWEEN')} ${low} ${this.formatKeyword('AND')} ${high}`;
    }

    if (operator === 'LIKE' && node.children.length === 2) {
      const left = this.formatNode(node.children[0]);
      const pattern = this.formatNode(node.children[1]);
      return `${left} ${this.formatKeyword('LIKE')} ${pattern}`;
    }

    if (node.children.length === 2) {
      const left = this.formatNode(node.children[0]);
      const right = this.formatNode(node.children[1]);
      return `${left} ${operator} ${right}`;
    }

    return '';
  }

  private formatFunctionCall(node: ASTNode): string {
    const funcName = node.properties?.functionName || '';
    const args = node.children?.map(c => this.formatNode(c)).join(', ') || '';
    const distinct = node.properties?.distinct ? this.formatKeyword('DISTINCT') + ' ' : '';
    
    return `${funcName}(${distinct}${args})`;
  }

  private formatSubquery(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }

    const innerSql = this.formatNode(node.children[0]);
    
    if (this.config.subqueryIndent === 'block') {
      const indented = innerSql.split('\n').map(line => this.getIndent() + line).join('\n');
      return `(\n${indented}\n${this.getIndent()})`;
    } else {
      return `(${innerSql})`;
    }
  }

  private formatInsertStatement(node: ASTNode): string {
    const lines: string[] = [];
    
    lines.push(this.formatKeyword('INSERT INTO'));
    
    if (node.children && node.children.length > 0) {
      lines.push(this.indentText(this.formatNode(node.children[0])));
    }

    if (node.properties?.columns) {
      const cols = node.properties.columns.map((c: ASTNode) => this.formatNode(c)).join(', ');
      lines.push(`(${cols})`);
    }

    if (node.properties?.values) {
      lines.push(this.formatKeyword('VALUES'));
      const valuesList = node.properties.values.map((values: ASTNode[]) => {
        const vals = values.map(v => this.formatNode(v)).join(', ');
        return `(${vals})`;
      });
      lines.push(this.indentText(valuesList.join(',\n')));
    }

    if (node.children && node.children.length > 1) {
      const selectStmt = node.children[1];
      if (selectStmt.type === 'SelectStatement') {
        lines.push(this.formatNode(selectStmt));
      }
    }

    return lines.join('\n');
  }

  private formatCreateTableStatement(node: ASTNode): string {
    const lines: string[] = [];
    
    lines.push(this.formatKeyword('CREATE TABLE'));
    lines.push(this.indentText(node.properties?.tableName || ''));
    
    if (node.properties?.columns) {
      const cols = node.properties.columns.map((col: any) => {
        return `${col.name} ${col.type}`;
      }).join(',\n');
      lines.push('(\n' + this.indentText(cols, 2) + '\n)');
    }

    return lines.join('\n');
  }

  private formatKeyword(keyword: string): string {
    if (this.config.keywordCase === 'upper') {
      return keyword.toUpperCase();
    } else {
      return keyword.toLowerCase();
    }
  }

  private getIndent(level?: number): string {
    const indentLevel = level !== undefined ? level : this.indent;
    return ' '.repeat(indentLevel * this.config.indentSize);
  }

  private indentText(text: string, level?: number): string {
    const indentStr = this.getIndent(level);
    return text.split('\n').map(line => indentStr + line).join('\n');
  }
}
