import { Token, ASTNode, ParseResult, ParseError, SqlDialect } from '../shared/types';
import { Tokenizer } from './Tokenizer';

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private dialect: SqlDialect = 'impala';
  private errors: ParseError[] = [];

  parse(sql: string, dialect: SqlDialect = 'impala'): ParseResult {
    this.dialect = dialect;
    this.errors = [];
    this.pos = 0;

    const tokenizer = new Tokenizer();
    this.tokens = tokenizer.tokenize(sql, dialect);

    try {
      const ast = this.parseStatement();
      
      if (this.errors.length > 0) {
        return {
          success: false,
          errors: this.errors,
        };
      }

      return {
        success: true,
        ast,
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          message: error instanceof Error ? error.message : 'Parse error',
          location: this.currentLocation(),
        }],
      };
    }
  }

  private parseStatement(): ASTNode {
    const token = this.current();

    if (token.type === 'KEYWORD') {
      const keyword = token.value.toUpperCase();
      
      switch (keyword) {
        case 'SELECT':
          return this.parseSelectStatement();
        case 'INSERT':
          return this.parseInsertStatement();
        case 'CREATE':
          return this.parseCreateStatement();
        case 'UPDATE':
          return this.parseUpdateStatement();
        case 'DELETE':
          return this.parseDeleteStatement();
        default:
          this.addError(`Unexpected keyword: ${keyword}`);
          return this.createNode('Expression');
      }
    }

    this.addError('Expected SQL statement');
    return this.createNode('Expression');
  }

  private parseSelectStatement(): ASTNode {
    const node = this.createNode('SelectStatement');
    node.children = [];

    // SELECT
    this.expect('KEYWORD', 'SELECT');

    // DISTINCT
    if (this.match('KEYWORD', 'DISTINCT')) {
      node.properties = { ...node.properties, distinct: true };
    }

    // Select list
    const selectList = this.parseSelectList();
    node.children.push(selectList);

    // FROM
    if (this.match('KEYWORD', 'FROM')) {
      const fromClause = this.parseFromClause();
      node.children.push(fromClause);
    }

    // WHERE
    if (this.match('KEYWORD', 'WHERE')) {
      const whereClause = this.parseWhereClause();
      node.children.push(whereClause);
    }

    // GROUP BY
    if (this.match('KEYWORD', 'GROUP')) {
      this.expect('KEYWORD', 'BY');
      const groupByClause = this.parseGroupByClause();
      node.children.push(groupByClause);
    }

    // HAVING
    if (this.match('KEYWORD', 'HAVING')) {
      const havingClause = this.parseHavingClause();
      node.children.push(havingClause);
    }

    // ORDER BY
    if (this.match('KEYWORD', 'ORDER')) {
      this.expect('KEYWORD', 'BY');
      const orderByClause = this.parseOrderByClause();
      node.children.push(orderByClause);
    }

    // LIMIT
    if (this.match('KEYWORD', 'LIMIT')) {
      node.properties = { ...node.properties, limit: this.parseExpression() };
    }

    return node;
  }

  private parseSelectList(): ASTNode {
    const node = this.createNode('SelectList');
    node.children = [];

    do {
      const expr = this.parseExpression();
      node.children.push(expr);

      // Alias
      if (this.match('KEYWORD', 'AS')) {
        const alias = this.parseIdentifier();
        expr.properties = { ...expr.properties, alias };
      } else if (this.check('IDENTIFIER') && !this.check('KEYWORD')) {
        const alias = this.parseIdentifier();
        expr.properties = { ...expr.properties, alias };
      }
    } while (this.match('PUNCTUATION', ','));

    return node;
  }

  private parseFromClause(): ASTNode {
    const node = this.createNode('FromClause');
    node.children = [];

    const tableRef = this.parseTableReference();
    node.children.push(tableRef);

    // JOIN
    while (this.isJoinKeyword()) {
      const joinClause = this.parseJoinClause();
      node.children.push(joinClause);
    }

    return node;
  }

  private parseTableReference(): ASTNode {
    const node = this.createNode('TableRef');
    
    if (this.match('PUNCTUATION', '(')) {
      // Subquery
      const subquery = this.parseStatement();
      this.expect('PUNCTUATION', ')');
      node.type = 'Subquery';
      node.children = [subquery];
    } else {
      node.value = this.parseIdentifier();
    }

    // Alias
    if (this.match('KEYWORD', 'AS')) {
      const alias = this.parseIdentifier();
      node.properties = { alias };
    } else if (this.check('IDENTIFIER') && !this.isJoinKeyword()) {
      const alias = this.parseIdentifier();
      node.properties = { alias };
    }

    return node;
  }

  private parseJoinClause(): ASTNode {
    const node = this.createNode('JoinClause');
    node.properties = { joinType: 'INNER' };

    // Join type
    if (this.match('KEYWORD', 'LEFT')) {
      this.match('KEYWORD', 'OUTER');
      node.properties.joinType = 'LEFT';
    } else if (this.match('KEYWORD', 'RIGHT')) {
      this.match('KEYWORD', 'OUTER');
      node.properties.joinType = 'RIGHT';
    } else if (this.match('KEYWORD', 'FULL')) {
      this.match('KEYWORD', 'OUTER');
      node.properties.joinType = 'FULL';
    } else if (this.match('KEYWORD', 'CROSS')) {
      node.properties.joinType = 'CROSS';
    } else if (this.match('KEYWORD', 'INNER')) {
      node.properties.joinType = 'INNER';
    }

    this.expect('KEYWORD', 'JOIN');

    // Table
    const tableRef = this.parseTableReference();
    node.children = [tableRef];

    // ON condition
    if (this.match('KEYWORD', 'ON')) {
      const condition = this.parseExpression();
      node.children.push(condition);
    }

    return node;
  }

  private parseWhereClause(): ASTNode {
    const node = this.createNode('WhereClause');
    node.children = [this.parseExpression()];
    return node;
  }

  private parseGroupByClause(): ASTNode {
    const node = this.createNode('GroupByClause');
    node.children = [];

    do {
      const expr = this.parseExpression();
      node.children.push(expr);
    } while (this.match('PUNCTUATION', ','));

    return node;
  }

  private parseHavingClause(): ASTNode {
    const node = this.createNode('HavingClause');
    node.children = [this.parseExpression()];
    return node;
  }

  private parseOrderByClause(): ASTNode {
    const node = this.createNode('OrderByClause');
    node.children = [];

    do {
      const expr = this.parseExpression();
      
      // ASC/DESC
      if (this.match('KEYWORD', 'ASC')) {
        expr.properties = { ...expr.properties, order: 'ASC' };
      } else if (this.match('KEYWORD', 'DESC')) {
        expr.properties = { ...expr.properties, order: 'DESC' };
      }

      node.children.push(expr);
    } while (this.match('PUNCTUATION', ','));

    return node;
  }

  private parseExpression(): ASTNode {
    return this.parseOrExpression();
  }

  private parseOrExpression(): ASTNode {
    let left = this.parseAndExpression();

    while (this.match('KEYWORD', 'OR')) {
      const right = this.parseAndExpression();
      const node = this.createNode('Expression');
      node.properties = { operator: 'OR' };
      node.children = [left, right];
      left = node;
    }

    return left;
  }

  private parseAndExpression(): ASTNode {
    let left = this.parseNotExpression();

    while (this.match('KEYWORD', 'AND')) {
      const right = this.parseNotExpression();
      const node = this.createNode('Expression');
      node.properties = { operator: 'AND' };
      node.children = [left, right];
      left = node;
    }

    return left;
  }

  private parseNotExpression(): ASTNode {
    if (this.match('KEYWORD', 'NOT')) {
      const expr = this.parseComparisonExpression();
      const node = this.createNode('Expression');
      node.properties = { operator: 'NOT' };
      node.children = [expr];
      return node;
    }

    return this.parseComparisonExpression();
  }

  private parseComparisonExpression(): ASTNode {
    const left = this.parseAdditiveExpression();

    // Comparison operators
    if (this.check('OPERATOR') && ['=', '<', '>', '<=', '>=', '<>', '!='].includes(this.current().value)) {
      const operator = this.advance().value;
      const right = this.parseAdditiveExpression();
      const node = this.createNode('Condition');
      node.properties = { operator };
      node.children = [left, right];
      return node;
    }

    // IN
    if (this.match('KEYWORD', 'IN')) {
      this.expect('PUNCTUATION', '(');
      const values = this.parseExpressionList();
      this.expect('PUNCTUATION', ')');
      const node = this.createNode('Condition');
      node.properties = { operator: 'IN' };
      node.children = [left, ...values];
      return node;
    }

    // BETWEEN
    if (this.match('KEYWORD', 'BETWEEN')) {
      const low = this.parseAdditiveExpression();
      this.expect('KEYWORD', 'AND');
      const high = this.parseAdditiveExpression();
      const node = this.createNode('Condition');
      node.properties = { operator: 'BETWEEN' };
      node.children = [left, low, high];
      return node;
    }

    // LIKE
    if (this.match('KEYWORD', 'LIKE')) {
      const pattern = this.parseAdditiveExpression();
      const node = this.createNode('Condition');
      node.properties = { operator: 'LIKE' };
      node.children = [left, pattern];
      return node;
    }

    // IS NULL / IS NOT NULL
    if (this.match('KEYWORD', 'IS')) {
      const not = this.match('KEYWORD', 'NOT');
      this.expect('KEYWORD', 'NULL');
      const node = this.createNode('Condition');
      node.properties = { operator: not ? 'IS NOT NULL' : 'IS NULL' };
      node.children = [left];
      return node;
    }

    return left;
  }

  private parseAdditiveExpression(): ASTNode {
    let left = this.parseMultiplicativeExpression();

    while (this.check('OPERATOR') && ['+', '-', '||'].includes(this.current().value)) {
      const operator = this.advance().value;
      const right = this.parseMultiplicativeExpression();
      const node = this.createNode('Expression');
      node.properties = { operator };
      node.children = [left, right];
      left = node;
    }

    return left;
  }

  private parseMultiplicativeExpression(): ASTNode {
    let left = this.parseUnaryExpression();

    while (this.check('OPERATOR') && ['*', '/', '%'].includes(this.current().value)) {
      const operator = this.advance().value;
      const right = this.parseUnaryExpression();
      const node = this.createNode('Expression');
      node.properties = { operator };
      node.children = [left, right];
      left = node;
    }

    return left;
  }

  private parseUnaryExpression(): ASTNode {
    if (this.check('OPERATOR') && ['-', '+'].includes(this.current().value)) {
      const operator = this.advance().value;
      const expr = this.parsePrimaryExpression();
      const node = this.createNode('Expression');
      node.properties = { operator };
      node.children = [expr];
      return node;
    }

    return this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): ASTNode {
    const token = this.current();

    // Parenthesized expression or subquery
    if (this.match('PUNCTUATION', '(')) {
      if (this.check('KEYWORD', 'SELECT')) {
        const subquery = this.parseSelectStatement();
        this.expect('PUNCTUATION', ')');
        const node = this.createNode('Subquery');
        node.children = [subquery];
        return node;
      }
      const expr = this.parseExpression();
      this.expect('PUNCTUATION', ')');
      return expr;
    }

    // Literal
    if (token.type === 'NUMBER' || token.type === 'STRING') {
      this.advance();
      const node = this.createNode('Literal');
      node.value = token.value;
      node.properties = { literalType: token.type };
      return node;
    }

    // NULL
    if (this.match('KEYWORD', 'NULL')) {
      const node = this.createNode('Literal');
      node.value = 'NULL';
      node.properties = { literalType: 'NULL' };
      return node;
    }

    // Function call
    if (token.type === 'IDENTIFIER' && this.peek().value === '(') {
      return this.parseFunctionCall();
    }

    // Column reference
    if (token.type === 'IDENTIFIER') {
      return this.parseColumnRef();
    }

    // Star
    if (this.match('OPERATOR', '*')) {
      const node = this.createNode('ColumnRef');
      node.value = '*';
      return node;
    }

    this.addError(`Unexpected token: ${token.value}`);
    this.advance();
    return this.createNode('Expression');
  }

  private parseFunctionCall(): ASTNode {
    const node = this.createNode('FunctionCall');
    const name = this.parseIdentifier();
    node.properties = { functionName: name };

    this.expect('PUNCTUATION', '(');
    
    // DISTINCT
    if (this.match('KEYWORD', 'DISTINCT')) {
      node.properties.distinct = true;
    }

    // Arguments
    if (!this.check('PUNCTUATION', ')')) {
      const args = this.parseExpressionList();
      node.children = args;
    }

    this.expect('PUNCTUATION', ')');

    return node;
  }

  private parseColumnRef(): ASTNode {
    const node = this.createNode('ColumnRef');
    let value = this.parseIdentifier();

    // Table.column or schema.table.column
    while (this.match('PUNCTUATION', '.')) {
      const next = this.parseIdentifier();
      value = `${value}.${next}`;
    }

    node.value = value;
    return node;
  }

  private parseExpressionList(): ASTNode[] {
    const list: ASTNode[] = [];

    do {
      const expr = this.parseExpression();
      list.push(expr);
    } while (this.match('PUNCTUATION', ','));

    return list;
  }

  private parseInsertStatement(): ASTNode {
    const node = this.createNode('InsertStatement');
    node.children = [];

    this.expect('KEYWORD', 'INSERT');
    this.expect('KEYWORD', 'INTO');

    const tableRef = this.parseTableReference();
    node.children.push(tableRef);

    // Column list
    if (this.match('PUNCTUATION', '(')) {
      const columns = this.parseExpressionList();
      node.properties = { columns };
      this.expect('PUNCTUATION', ')');
    }

    // VALUES or SELECT
    if (this.match('KEYWORD', 'VALUES')) {
      const valuesList: ASTNode[][] = [];
      do {
        this.expect('PUNCTUATION', '(');
        const values = this.parseExpressionList();
        valuesList.push(values);
        this.expect('PUNCTUATION', ')');
      } while (this.match('PUNCTUATION', ','));
      node.properties = { ...node.properties, values: valuesList };
    } else if (this.check('KEYWORD', 'SELECT')) {
      const selectStmt = this.parseSelectStatement();
      node.children.push(selectStmt);
    }

    return node;
  }

  private parseCreateStatement(): ASTNode {
    const node = this.createNode('CreateTableStatement');
    node.children = [];

    this.expect('KEYWORD', 'CREATE');
    this.expect('KEYWORD', 'TABLE');

    const tableName = this.parseIdentifier();
    node.properties = { tableName };

    // Column definitions
    if (this.match('PUNCTUATION', '(')) {
      const columns: any[] = [];
      do {
        const colName = this.parseIdentifier();
        const colType = this.parseIdentifier();
        columns.push({ name: colName, type: colType });
      } while (this.match('PUNCTUATION', ','));
      this.expect('PUNCTUATION', ')');
      node.properties = { ...node.properties, columns };
    }

    return node;
  }

  private parseUpdateStatement(): ASTNode {
    const node = this.createNode('Expression');
    node.properties = { statementType: 'UPDATE' };
    
    this.expect('KEYWORD', 'UPDATE');
    const table = this.parseTableReference();
    node.children = [table];

    this.expect('KEYWORD', 'SET');
    // Skip SET clause for now
    while (!this.check('KEYWORD', 'WHERE') && !this.check('EOF')) {
      this.advance();
    }

    if (this.match('KEYWORD', 'WHERE')) {
      const where = this.parseWhereClause();
      node.children.push(where);
    }

    return node;
  }

  private parseDeleteStatement(): ASTNode {
    const node = this.createNode('Expression');
    node.properties = { statementType: 'DELETE' };
    
    this.expect('KEYWORD', 'DELETE');
    this.expect('KEYWORD', 'FROM');
    const table = this.parseTableReference();
    node.children = [table];

    if (this.match('KEYWORD', 'WHERE')) {
      const where = this.parseWhereClause();
      node.children.push(where);
    }

    return node;
  }

  private parseIdentifier(): string {
    const token = this.current();
    if (token.type === 'IDENTIFIER' || token.type === 'KEYWORD') {
      this.advance();
      return token.value;
    }
    this.addError('Expected identifier');
    return '';
  }

  // Helper methods
  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '', location: { line: 0, column: 0 } };
  }

  private peek(): Token {
    return this.tokens[this.pos + 1] || { type: 'EOF', value: '', location: { line: 0, column: 0 } };
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private check(type: string, value?: string): boolean {
    const token = this.current();
    if (token.type !== type) return false;
    if (value !== undefined && token.value.toUpperCase() !== value.toUpperCase()) return false;
    return true;
  }

  private match(type: string, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: string, value?: string): Token {
    if (this.check(type, value)) {
      return this.advance();
    }
    this.addError(`Expected ${type}${value ? ` ${value}` : ''}`);
    return this.current();
  }

  private isJoinKeyword(): boolean {
    const token = this.current();
    if (token.type !== 'KEYWORD') return false;
    const keyword = token.value.toUpperCase();
    return ['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'].includes(keyword);
  }

  private createNode(type: any): ASTNode {
    return {
      type,
      location: this.currentLocation(),
      children: [],
      properties: {},
    };
  }

  private currentLocation() {
    const token = this.current();
    return token.location || { line: 1, column: 1 };
  }

  private addError(message: string): void {
    this.errors.push({
      message,
      location: this.currentLocation(),
    });
  }
}
