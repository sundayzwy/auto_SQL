import { Token, ASTNode, ParseResult, ParseError } from '../../shared/types';
import { Tokenizer } from './Tokenizer';

/**
 * SQL 递归下降语法分析器（Parser）
 *
 * 将词法分析器（Tokenizer）产生的 Token 序列解析为抽象语法树（AST）。
 * 采用递归下降解析策略，每个非终结符对应一个解析方法。
 *
 * 支持的 SQL 语句类型：
 * - SELECT（含 FROM、WHERE、GROUP BY、HAVING、ORDER BY、LIMIT、JOIN 等子句）
 * - INSERT（含 VALUES 和 SELECT 子查询两种形式）
 * - CREATE TABLE
 * - UPDATE / DELETE
 *
 * 表达式解析遵循标准的运算符优先级：
 * OR → AND → NOT → 比较运算 → 加减运算 → 乘除运算 → 一元运算 → 基本表达式
 *
 * 使用方式：
 * ```
 * const parser = new Parser();
 * const result = parser.parse('SELECT * FROM t WHERE a > 1', 'impala');
 * if (result.success) { console.log(result.ast); }
 * ```
 */
export class Parser {
  /** 当前待解析的 Token 序列 */
  private tokens: Token[] = [];
  /** 当前 Token 在 tokens 数组中的索引位置 */
  private pos: number = 0;
  /** 解析过程中收集的错误信息 */
  private errors: ParseError[] = [];

  /**
   * 解析 SQL 字符串，返回解析结果
   *
   * 先调用 Tokenizer 进行词法分析，再对 Token 序列进行语法分析。
   * 如果解析成功，返回包含 AST 的 ParseResult；如果失败，返回错误列表。
   *
   * @param sql - 待解析的 SQL 字符串
   * @param dialect - SQL 方言，默认为 'impala'
   * @returns 解析结果，包含 success 标志、AST 或错误信息
   */
  parse(sql: string): ParseResult {
    this.errors = [];
    this.pos = 0;

    const tokenizer = new Tokenizer();
    this.tokens = tokenizer.tokenize(sql);

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

  /**
   * 解析顶层 SQL 语句
   *
   * 根据第一个关键字判断语句类型，分派到对应的解析方法：
   * SELECT → parseSelectStatement, INSERT → parseInsertStatement,
   * CREATE → parseCreateStatement, UPDATE → parseUpdateStatement,
   * DELETE → parseDeleteStatement。
   *
   * @returns 解析出的 AST 节点
   */
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

  /**
   * 解析 SELECT 语句
   *
   * 语法规则：
   * SELECT [DISTINCT] select_list
   *   [FROM from_clause]
   *   [WHERE where_clause]
   *   [GROUP BY group_by_clause]
   *   [HAVING having_clause]
   *   [ORDER BY order_by_clause]
   *   [LIMIT expression]
   *
   * @returns SelectStatement AST 节点
   */
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

  /**
   * 解析 SELECT 列表（SELECT 关键字之后的列/表达式列表）
   *
   * 语法规则：expression [, expression]*
   * 每个表达式后可以跟可选的别名（通过 AS 关键字或隐式别名）。
   *
   * @returns SelectList AST 节点
   */
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

  /**
   * 解析 FROM 子句
   *
   * 语法规则：FROM table_reference [join_clause]*
   * 先解析第一个表引用，然后循环解析后续的 JOIN 子句。
   *
   * @returns FromClause AST 节点
   */
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

  /**
   * 解析表引用（表名或子查询）
   *
   * 语法规则：table_name | ( subquery )
   * 如果是括号包裹的子查询，节点类型为 'Subquery'；
   * 否则为普通的表名引用，类型为 'TableRef'。
   * 支持可选的别名（AS alias 或隐式别名）。
   *
   * @returns TableRef 或 Subquery AST 节点
   */
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

  /**
   * 解析 JOIN 子句
   *
   * 语法规则：
   * [join_type] JOIN table_reference [ON condition]
   * 支持的连接类型：LEFT [OUTER]、RIGHT [OUTER]、FULL [OUTER]、CROSS、INNER。
   * 默认为 INNER JOIN。
   *
   * @returns JoinClause AST 节点
   */
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

  /**
   * 解析 WHERE 子句
   *
   * 语法规则：WHERE expression
   *
   * @returns WhereClause AST 节点
   */
  private parseWhereClause(): ASTNode {
    const node = this.createNode('WhereClause');
    node.children = [this.parseExpression()];
    return node;
  }

  /**
   * 解析 GROUP BY 子句
   *
   * 语法规则：GROUP BY expression [, expression]*
   *
   * @returns GroupByClause AST 节点
   */
  private parseGroupByClause(): ASTNode {
    const node = this.createNode('GroupByClause');
    node.children = [];

    do {
      const expr = this.parseExpression();
      node.children.push(expr);
    } while (this.match('PUNCTUATION', ','));

    return node;
  }

  /**
   * 解析 HAVING 子句
   *
   * 语法规则：HAVING expression
   *
   * @returns HavingClause AST 节点
   */
  private parseHavingClause(): ASTNode {
    const node = this.createNode('HavingClause');
    node.children = [this.parseExpression()];
    return node;
  }

  /**
   * 解析 ORDER BY 子句
   *
   * 语法规则：ORDER BY expression [ASC | DESC] [, expression [ASC | DESC]]*
   * 每个排序表达式可以跟可选的 ASC（升序）或 DESC（降序）关键字。
   *
   * @returns OrderByClause AST 节点
   */
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

  /**
   * 解析表达式（表达式层级的入口方法）
   *
   * 表达式解析的优先级从低到高：
   * OR → AND → NOT → 比较运算 → 加减运算 → 乘除运算 → 一元运算 → 基本表达式
   * 本方法直接委托给 parseOrExpression，即最低优先级的 OR 运算。
   *
   * @returns 表达式 AST 节点
   */
  private parseExpression(): ASTNode {
    return this.parseOrExpression();
  }

  /**
   * 解析 OR 表达式（优先级最低的二元逻辑运算）
   *
   * 语法规则：and_expression (OR and_expression)*
   * 采用左递归方式构建 AST，operator 属性为 'OR'。
   *
   * @returns 表达式 AST 节点
   */
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

  /**
   * 解析 AND 表达式（优先级高于 OR 的二元逻辑运算）
   *
   * 语法规则：not_expression (AND not_expression)*
   * 采用左递归方式构建 AST，operator 属性为 'AND'。
   *
   * @returns 表达式 AST 节点
   */
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

  /**
   * 解析 NOT 表达式（一元逻辑非运算）
   *
   * 语法规则：NOT comparison_expression | comparison_expression
   * 如果遇到 NOT 关键字，则创建 operator 属性为 'NOT' 的一元表达式节点。
   *
   * @returns 表达式 AST 节点
   */
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

  /**
   * 解析比较表达式（=, <, >, <=, >=, <>, !=, IN, BETWEEN, LIKE, IS NULL）
   *
   * 支持多种比较/条件运算：
   * - 基本比较：=, <, >, <=, >=, <>, !=
   * - IN 条件：IN (value1, value2, ...)
   * - BETWEEN 条件：BETWEEN low AND high
   * - LIKE 条件：LIKE pattern
   * - NULL 检查：IS [NOT] NULL
   * 如果当前不是比较运算符，则直接返回加性表达式的结果。
   *
   * @returns Condition 或表达式 AST 节点
   */
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

  /**
   * 解析加性表达式（+, -, || 字符串拼接）
   *
   * 语法规则：multiplicative_expression ((+| -| ||) multiplicative_expression)*
   * 采用左递归方式构建 AST，支持加法、减法和字符串拼接运算。
   *
   * @returns 表达式 AST 节点
   */
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

  /**
   * 解析乘性表达式（*, /, %）
   *
   * 语法规则：unary_expression ((*| /| %) unary_expression)*
   * 采用左递归方式构建 AST，支持乘法、除法和取模运算。
   *
   * @returns 表达式 AST 节点
   */
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

  /**
   * 解析一元表达式（一元正负号）
   *
   * 语法规则：[-| +] primary_expression
   * 支持一元负号（-）和一元正号（+）运算符。
   *
   * @returns 表达式 AST 节点
   */
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

  /**
   * 解析基本表达式（表达式解析的最底层）
   *
   * 支持的表达式类型：
   * - 括号表达式或子查询：( expr ) 或 (SELECT ...)
   * - 字面量：NUMBER、STRING 类型的 Token
   * - NULL 字面量
   * - 函数调用：identifier( ... )
   * - 列引用：identifier 或 table.column 或 *
   *
   * @returns 基本表达式 AST 节点
   */
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

  /**
   * 解析函数调用
   *
   * 语法规则：function_name ( [DISTINCT] [argument [, argument]*] )
   * 支持 DISTINCT 关键字（如 COUNT(DISTINCT col)），
   * 参数列表可以为空（如 NOW()）。
   *
   * @returns FunctionCall AST 节点
   */
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

  /**
   * 解析列引用
   *
   * 语法规则：identifier [. identifier]*
   * 支持多级引用（如 schema.table.column），用点号连接各级标识符。
   *
   * @returns ColumnRef AST 节点
   */
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

  /**
   * 解析逗号分隔的表达式列表
   *
   * 语法规则：expression [, expression]*
   * 用于函数参数列表、IN 子句的值列表、INSERT 的列列表等场景。
   *
   * @returns 表达式 AST 节点数组
   */
  private parseExpressionList(): ASTNode[] {
    const list: ASTNode[] = [];

    do {
      const expr = this.parseExpression();
      list.push(expr);
    } while (this.match('PUNCTUATION', ','));

    return list;
  }

  /**
   * 解析 INSERT 语句
   *
   * 语法规则：
   * INSERT INTO table_reference [(column_list)]
   *   VALUES (value_list) [, (value_list)]*
   *   | SELECT ...
   * 支持 VALUES 多行插入和 SELECT 子查询插入两种形式。
   *
   * @returns InsertStatement AST 节点
   */
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

  /**
   * 解析 CREATE TABLE 语句
   *
   * 语法规则：
   * CREATE TABLE table_name (column_name column_type [, column_name column_type]*)
   *
   * @returns CreateTableStatement AST 节点
   */
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

  /**
   * 解析 UPDATE 语句
   *
   * 语法规则：
   * UPDATE table_reference SET ... [WHERE where_clause]
   * 注意：当前版本对 SET 子句仅做跳过处理，不进行详细解析。
   *
   * @returns UPDATE 语句 AST 节点
   */
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

  /**
   * 解析 DELETE 语句
   *
   * 语法规则：
   * DELETE FROM table_reference [WHERE where_clause]
   *
   * @returns DELETE 语句 AST 节点
   */
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

  /**
   * 解析标识符（表名、列名、函数名等）
   *
   * 接受 IDENTIFIER 和 KEYWORD 两种类型的 Token，
   * 因为某些 SQL 关键字（如 FROM 等）在特定上下文中也可以作为标识符使用。
   *
   * @returns 标识符的字符串值
   */
  private parseIdentifier(): string {
    const token = this.current();
    if (token.type === 'IDENTIFIER' || token.type === 'KEYWORD') {
      this.advance();
      return token.value;
    }
    this.addError('Expected identifier');
    return '';
  }

  // ==================== 辅助方法 ====================

  /**
   * 获取当前 Token，不移动指针
   *
   * @returns 当前 Token，如果已到达末尾则返回 EOF Token
   */
  private current(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '', location: { line: 0, column: 0 } };
  }

  /**
   * 查看下一个 Token（向前看一个），不移动指针
   *
   * @returns 下一个 Token，如果已到达末尾则返回 EOF Token
   */
  private peek(): Token {
    return this.tokens[this.pos + 1] || { type: 'EOF', value: '', location: { line: 0, column: 0 } };
  }

  /**
   * 消费当前 Token 并将指针向后移动一位
   *
   * @returns 被消费的当前 Token
   */
  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  /**
   * 检查当前 Token 是否匹配指定的类型和值，不消费 Token
   *
   * @param type - 期望的 Token 类型
   * @param value - 可选的期望 Token 值（不区分大小写）
   * @returns 如果匹配则返回 true，否则返回 false
   */
  private check(type: string, value?: string): boolean {
    const token = this.current();
    if (token.type !== type) return false;
    if (value !== undefined && token.value.toUpperCase() !== value.toUpperCase()) return false;
    return true;
  }

  /**
   * 检查当前 Token 是否匹配指定类型和值，如果匹配则消费之
   *
   * 相当于 check + advance 的组合操作，是递归下降解析中最常用的方法之一。
   *
   * @param type - 期望的 Token 类型
   * @param value - 可选的期望 Token 值（不区分大小写）
   * @returns 如果匹配并成功消费则返回 true，否则返回 false
   */
  private match(type: string, value?: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * 期望当前 Token 匹配指定类型和值，匹配则消费，否则记录错误
   *
   * 用于那些必须出现的 Token（如 SELECT 语句中的 SELECT 关键字）。
   * 如果匹配失败，不会中断解析流程，而是添加错误信息并继续。
   *
   * @param type - 期望的 Token 类型
   * @param value - 可选的期望 Token 值（不区分大小写）
   * @returns 当前 Token（无论是否匹配）
   */
  private expect(type: string, value?: string): Token {
    if (this.check(type, value)) {
      return this.advance();
    }
    this.addError(`Expected ${type}${value ? ` ${value}` : ''}`);
    return this.current();
  }

  /**
   * 判断当前 Token 是否为 JOIN 相关关键字
   *
   * 包括：JOIN, INNER, LEFT, RIGHT, FULL, CROSS
   * 用于 FROM 子句中判断是否开始解析 JOIN 部分。
   *
   * @returns 如果是 JOIN 关键字则返回 true，否则返回 false
   */
  private isJoinKeyword(): boolean {
    const token = this.current();
    if (token.type !== 'KEYWORD') return false;
    const keyword = token.value.toUpperCase();
    return ['JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS'].includes(keyword);
  }

  /**
   * 创建 AST 节点
   *
   * 初始化一个包含类型、位置信息、空子节点列表和空属性对象的节点。
   *
   * @param type - 节点类型名称
   * @returns 新创建的 ASTNode
   */
  private createNode(type: any): ASTNode {
    return {
      type,
      location: this.currentLocation(),
      children: [],
      properties: {},
    };
  }

  /**
   * 获取当前 Token 的位置信息（行号和列号）
   *
   * 用于创建 AST 节点和错误报告。
   *
   * @returns 包含 line 和 column 的位置对象
   */
  private currentLocation() {
    const token = this.current();
    return token.location || { line: 1, column: 1 };
  }

  /**
   * 向错误列表中添加一条解析错误
   *
   * 错误信息包含描述文本和当前位置信息。
   * 使用错误恢复策略：记录错误后继续解析，尽可能发现更多错误。
   *
   * @param message - 错误描述信息
   */
  private addError(message: string): void {
    this.errors.push({
      message,
      location: this.currentLocation(),
    });
  }
}
