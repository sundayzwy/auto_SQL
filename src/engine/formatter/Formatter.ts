import { ASTNode, FormatConfig, FormatResult } from '../../shared/types';
import { Parser } from '../parser/Parser';

/**
 * SQL 格式化器
 * 根据配置将 SQL 语句格式化为规范的、可读性更高的格式。
 * 支持关键字大小写转换、缩进控制、字段列表排列方式等格式化选项。
 * 核心流程：解析 SQL → 生成 AST → 遍历 AST 节点并格式化输出。
 */
export class Formatter {
  /** 格式化配置，如缩进大小、关键字大小写等 */
  private config: FormatConfig;
  /** 当前缩进层级 */
  private indent: number = 0;

  constructor(config: FormatConfig) {
    this.config = config;
  }

  /**
   * 格式化 SQL 语句
   * 先解析 SQL 为 AST，再递归遍历 AST 节点生成格式化后的 SQL 文本。
   * @param sql - 原始 SQL 语句
   * @param dialect - SQL 方言（默认 impala）
   * @returns 格式化结果，成功时包含 formattedSql，失败时包含 errors
   */
  format(sql: string): FormatResult {
    this.indent = 0;

    const parser = new Parser();
    const parseResult = parser.parse(sql);

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

  /**
   * 根据 AST 节点类型分发到对应的格式化方法
   * 这是格式化递归遍历的核心入口，每种节点类型有独立的格式化处理逻辑。
   * @param node - AST 节点
   * @returns 格式化后的 SQL 片段文本
   */
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

  /**
   * 格式化 SELECT 语句
   * 按 SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT 的顺序
   * 逐个子句进行格式化，每个子句之间用换行分隔。
   * @param node - SelectStatement 类型的 AST 节点
   * @returns 格式化后的 SELECT 语句文本
   */
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

  /**
   * 格式化 SELECT 字段列表
   * 根据配置的 fieldListStyle（each-line 或 inline）决定字段之间用换行还是空格分隔。
   * 如果字段有别名，则追加 AS 关键字和别名。
   * @param node - SelectList 类型的 AST 节点
   * @returns 格式化后的字段列表文本
   */
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

  /**
   * 格式化 FROM 子句
   * 遍历 FROM 子句的子节点，处理表引用（TableRef）、子查询（Subquery）和连接（JoinClause）。
   * @param node - FromClause 类型的 AST 节点
   * @returns 格式化后的 FROM 子句文本
   */
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

  /**
   * 格式化表引用
   * 输出表名，如果有别名则追加 AS 关键字和别名。
   * @param node - TableRef 类型的 AST 节点
   * @returns 格式化后的表引用文本
   */
  private formatTableRef(node: ASTNode): string {
    let result = node.value || '';
    if (node.properties?.alias) {
      result += ' ' + this.formatKeyword('AS') + ' ' + node.properties.alias;
    }
    return result;
  }

  /**
   * 格式化 JOIN 子句
   * 根据 joinType（INNER/CROSS/LEFT/RIGHT/FULL）输出对应的连接关键字，
   * 并格式化连接的目标表和 ON 条件。
   * @param node - JoinClause 类型的 AST 节点
   * @returns 格式化后的 JOIN 子句文本
   */
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

  /**
   * 格式化 WHERE 子句
   * 将 WHERE 条件格式化输出，首个子节点为条件表达式。
   * @param node - WhereClause 类型的 AST 节点
   * @returns 格式化后的 WHERE 子句文本
   */
  private formatWhereClause(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }
    return this.formatNode(node.children[0]);
  }

  /**
   * 格式化 GROUP BY 子句
   * 根据 fieldListStyle 配置决定分组字段之间用换行还是空格分隔。
   * @param node - GroupByClause 类型的 AST 节点
   * @returns 格式化后的 GROUP BY 子句文本
   */
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

  /**
   * 格式化 ORDER BY 子句
   * 每个排序字段追加其排序方向（ASC/DESC），
   * 根据 fieldListStyle 配置决定字段之间用换行还是空格分隔。
   * @param node - OrderByClause 类型的 AST 节点
   * @returns 格式化后的 ORDER BY 子句文本
   */
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

  /**
   * 格式化 HAVING 子句
   * 将 HAVING 过滤条件格式化输出，首个子节点为条件表达式。
   * @param node - HavingClause 类型的 AST 节点
   * @returns 格式化后的 HAVING 子句文本
   */
  private formatHavingClause(node: ASTNode): string {
    if (!node.children || node.children.length === 0) {
      return '';
    }
    return this.formatNode(node.children[0]);
  }

  /**
   * 格式化表达式（如 AND/OR 组合条件、算术表达式等）
   * 对于 AND/OR 操作符，根据 whereClauseStyle 配置决定是否换行。
   * 对于 NOT 操作符，格式化为一元前缀形式。
   * @param node - Expression 类型的 AST 节点
   * @returns 格式化后的表达式文本
   */
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

  /**
   * 格式化条件表达式（如 IS NULL、IN、BETWEEN、LIKE、比较运算等）
   * 根据不同的条件操作符类型采用对应的格式化策略。
   * @param node - Condition 类型的 AST 节点
   * @returns 格式化后的条件表达式文本
   */
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

  /**
   * 格式化函数调用
   * 格式为 函数名(参数1, 参数2, ...)，如果函数使用了 DISTINCT 则追加 DISTINCT 关键字。
   * @param node - FunctionCall 类型的 AST 节点
   * @returns 格式化后的函数调用文本
   */
  private formatFunctionCall(node: ASTNode): string {
    const funcName = node.properties?.functionName || '';
    const args = node.children?.map(c => this.formatNode(c)).join(', ') || '';
    const distinct = node.properties?.distinct ? this.formatKeyword('DISTINCT') + ' ' : '';
    
    return `${funcName}(${distinct}${args})`;
  }

  /**
   * 格式化子查询
   * 根据 subqueryIndent 配置决定使用 block 缩进格式还是 inline 行内格式。
   * block 格式：子查询内容整体缩进并换行；inline 格式：子查询紧跟在括号内。
   * @param node - Subquery 类型的 AST 节点
   * @returns 格式化后的子查询文本
   */
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

  /**
   * 格式化 INSERT 语句
   * 格式化 INSERT INTO 目标表、列列表、VALUES 子句或 SELECT 子查询。
   * 支持 INSERT INTO ... SELECT 和 INSERT INTO ... VALUES 两种形式。
   * @param node - InsertStatement 类型的 AST 节点
   * @returns 格式化后的 INSERT 语句文本
   */
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

  /**
   * 格式化 CREATE TABLE 语句
   * 格式化 CREATE TABLE 关键字、表名以及列定义列表。
   * @param node - CreateTableStatement 类型的 AST 节点
   * @returns 格式化后的 CREATE TABLE 语句文本
   */
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

  /**
   * 根据配置转换关键字大小写
   * 根据 keywordCase 配置返回大写或小写形式的关键字。
   * @param keyword - SQL 关键字
   * @returns 转换大小写后的关键字
   */
  private formatKeyword(keyword: string): string {
    if (this.config.keywordCase === 'upper') {
      return keyword.toUpperCase();
    } else {
      return keyword.toLowerCase();
    }
  }

  /**
   * 获取缩进字符串
   * 根据给定的缩进层级和配置的 indentSize 生成空格缩进字符串。
   * @param level - 缩进层级，未指定时使用当前实例的缩进层级
   * @returns 由空格组成的缩进字符串
   */
  private getIndent(level?: number): string {
    const indentLevel = level !== undefined ? level : this.indent;
    return ' '.repeat(indentLevel * this.config.indentSize);
  }

  /**
   * 对文本进行缩进处理
   * 在文本的每一行前添加缩进字符串，用于多行文本的缩进格式化。
   * @param text - 需要缩进的文本
   * @param level - 缩进层级，未指定时使用当前实例的缩进层级
   * @returns 缩进后的文本
   */
  private indentText(text: string, level?: number): string {
    const indentStr = this.getIndent(level);
    return text.split('\n').map(line => indentStr + line).join('\n');
  }
}
