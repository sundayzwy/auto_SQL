// SQL 关键字定义
export const SQL_KEYWORDS = new Set([
  // SELECT 相关
  'SELECT', 'FROM', 'WHERE', 'AS', 'ON', 'USING',
  // JOIN 相关
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
  'LEFT_OUTER', 'RIGHT_OUTER', 'FULL_OUTER',
  // 条件相关
  'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
  // 分组排序
  'GROUP', 'BY', 'ORDER', 'HAVING', 'ASC', 'DESC',
  // 集合操作
  'UNION', 'ALL', 'INTERSECT', 'EXCEPT', 'MINUS',
  // 插入更新
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  // 表操作
  'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'COLUMN',
  'PARTITIONED', 'STORED', 'FORMAT', 'LOCATION',
  // Impala 特有
  'SHUFFLE', 'BROADCAST', '[SHUFFLE]', '[BROADCAST]',
  'COMPUTE', 'STATS', 'INVALIDATE', 'METADATA',
  'DISTRIBUTE', 'SORT', 'CLUSTER',
  // Oracle 特有
  'ROWNUM', 'ROWID', 'CONNECT', 'START', 'PRIOR', 'NOCYCLE',
  'MERGE', 'MATCHED', 'WHEN', 'THEN',
  // 数据类型
  'INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT',
  'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC',
  'STRING', 'VARCHAR', 'CHAR', 'BOOLEAN',
  'DATE', 'TIMESTAMP', 'DATETIME',
  'BINARY', 'VARBINARY',
  // 其他
  'DISTINCT', 'ALL', 'TOP', 'LIMIT', 'OFFSET',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'CAST', 'CONVERT', 'COALESCE', 'NULLIF',
  'TRUE', 'FALSE', 'UNKNOWN',
  'WITH', 'RECURSIVE',
  'WINDOW', 'PARTITION', 'ROWS', 'RANGE',
  'OVER', 'PRECEDING', 'FOLLOWING', 'UNBOUNDED', 'CURRENT', 'ROW',
  'FETCH', 'FIRST', 'NEXT', 'ONLY', 'PERCENT',
  'FOR', 'UPDATE', 'OF', 'SKIP', 'LOCKED',
  'COMMENT', 'EXPLAIN', 'ANALYZE', 'DESCRIBE', 'SHOW',
]);

// Impala 特有函数
export const IMPALA_FUNCTIONS = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'GROUP_CONCAT', 'APPEND_TRUNCATE',
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
  'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
  'ABS', 'CEIL', 'FLOOR', 'ROUND', 'POWER', 'SQRT',
  'MOD', 'LN', 'LOG', 'LOG2', 'LOG10', 'EXP',
  'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN',
  'CONCAT', 'SUBSTR', 'SUBSTRING', 'LENGTH', 'CHAR_LENGTH',
  'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM',
  'LPAD', 'RPAD', 'REVERSE', 'REPEAT', 'REPLACE',
  'INSTR', 'LOCATE', 'FIND_IN_SET', 'REGEXP_EXTRACT',
  'NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE',
  'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
  'DATE_ADD', 'DATE_SUB', 'DATEDIFF', 'DATE_PART',
  'FROM_UNIXTIME', 'UNIX_TIMESTAMP', 'TO_DATE',
  'IF', 'NVL', 'NVL2', 'DECODE',
  'CAST', 'COALESCE', 'NULLIF', 'IFNULL',
]);

// Oracle 特有函数
export const ORACLE_FUNCTIONS = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'LISTAGG', 'STRING_AGG',
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE',
  'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
  'NTH_VALUE', 'CUME_DIST', 'PERCENT_RANK',
  'ABS', 'CEIL', 'FLOOR', 'ROUND', 'POWER', 'SQRT',
  'MOD', 'LN', 'LOG', 'LOG10', 'EXP', 'SIGN', 'TRUNC',
  'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2',
  'CONCAT', 'SUBSTR', 'SUBSTRING', 'LENGTH', 'LENGTHB',
  'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM',
  'LPAD', 'RPAD', 'REVERSE', 'REPLACE',
  'INSTR', 'INSTRB', 'TRANSLATE', 'ASCII', 'CHR',
  'TO_CHAR', 'TO_NUMBER', 'TO_DATE', 'TO_TIMESTAMP',
  'SYSDATE', 'SYSTIMESTAMP', 'CURRENT_TIMESTAMP', 'CURRENT_DATE',
  'ADD_MONTHS', 'MONTHS_BETWEEN', 'NEXT_DAY', 'LAST_DAY',
  'EXTRACT', 'NUMTODSINTERVAL', 'NUMTOYMINTERVAL',
  'DECODE', 'NVL', 'NVL2', 'NULLIF', 'COALESCE',
  'GREATEST', 'LEAST',
  'USER', 'UID', 'SYS_CONTEXT', 'USERENV',
]);

// 操作符
export const OPERATORS = new Set([
  '=', '<', '>', '<=', '>=', '<>', '!=',
  '+', '-', '*', '/', '%',
  '||', '&&',
]);

// 标点符号
export const PUNCTUATION = new Set([
  '(', ')', ',', ';', '.', '[', ']', '{', '}',
]);
