import { ColumnDefinition, SqlDialect, TableMetadata } from '../../shared/types';

/**
 * DDL 解析器
 * 解析 CREATE TABLE 等 DDL 语句，提取表名、列定义、分区键、存储格式等表元数据信息。
 * 支持多语句 DDL 批量解析，自动按分号拆分语句。
 */
export class DdlParser {
  /**
   * 解析 DDL 语句并提取表元数据
   * 先按分号拆分多条 DDL 语句，再逐个解析 CREATE TABLE 语句。
   * @param ddl - DDL 语句文本（可包含多条语句）
   * @param dialect - SQL 方言（默认 impala）
   * @returns 解析出的表元数据数组
   */
  parse(ddl: string, dialect: SqlDialect = 'impala'): TableMetadata[] {
    const tables: TableMetadata[] = [];
    
    const statements = this.splitStatements(ddl);
    
    for (const stmt of statements) {
      const trimmed = stmt.trim();
      if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
        const table = this.parseCreateTable(trimmed, dialect);
        if (table) {
          tables.push(table);
        }
      }
    }
    
    return tables;
  }

  /**
   * 按分号拆分 DDL 语句
   * 遍历字符，正确处理字符串字面量中的分号（不将其作为语句分隔符），
   * 将 DDL 文本拆分为独立的语句列表。
   * @param ddl - DDL 语句文本
   * @returns 拆分后的语句数组
   */
  private splitStatements(ddl: string): string[] {
    const statements: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < ddl.length; i++) {
      const char = ddl[i];
      
      if (!inString && (char === "'" || char === '"')) {
        inString = true;
        stringChar = char;
        current += char;
      } else if (inString && char === stringChar) {
        inString = false;
        current += char;
      } else if (!inString && char === ';') {
        if (current.trim()) {
          statements.push(current);
        }
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      statements.push(current);
    }
    
    return statements;
  }

  /**
   * 解析单条 CREATE TABLE 语句
   * 使用正则表达式提取表名、列定义、分区键和存储格式等信息。
   * 支持 IF NOT EXISTS 语法。
   * @param ddl - 单条 CREATE TABLE 语句
   * @param dialect - SQL 方言
   * @returns 解析出的表元数据，解析失败时返回 null
   */
  private parseCreateTable(ddl: string, dialect: SqlDialect): TableMetadata | null {
    const tableMatch = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i);
    if (!tableMatch) {
      return null;
    }
    
    const tableName = tableMatch[1].replace(/[`"]/g, '');
    
    const columns = this.parseColumns(ddl);
    const partitionKeys = this.parsePartitionKeys(ddl);
    const storageFormat = this.parseStorageFormat(ddl);
    
    return {
      tableName,
      dialect,
      columns,
      partitionKeys,
      storageFormat,
      importedAt: new Date().toISOString(),
    };
  }

  /**
   * 解析列定义
   * 从 CREATE TABLE 语句的括号内提取列名和数据类型，
   * 跳过 PARTITIONED BY、STORED AS、LOCATION、CLUSTERED BY 等非列定义关键字。
   * 同时检测 NOT NULL 约束以确定列是否可为空。
   * @param ddl - CREATE TABLE 语句
   * @returns 列定义数组
   */
  private parseColumns(ddl: string): ColumnDefinition[] {
    const columns: ColumnDefinition[] = [];
    
    const columnsMatch = ddl.match(/\(([\s\S]+)\)/);
    if (!columnsMatch) {
      return columns;
    }
    
    const columnsText = columnsMatch[1];
    const lines = columnsText.split(',').map(l => l.trim()).filter(l => l);
    
    for (const line of lines) {
      if (line.toUpperCase().startsWith('PARTITIONED') || 
          line.toUpperCase().startsWith('STORED') ||
          line.toUpperCase().startsWith('LOCATION') ||
          line.toUpperCase().startsWith('CLUSTERED')) {
        continue;
      }
      
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const name = parts[0].replace(/[`"]/g, '');
        const type = parts[1].replace(/[,]/g, '');
        
        columns.push({
          name,
          type: type.toUpperCase(),
          nullable: !line.toUpperCase().includes('NOT NULL'),
        });
      }
    }
    
    return columns;
  }

  /**
   * 解析分区键
   * 从 PARTITIONED BY 子句中提取分区键列名列表。
   * @param ddl - CREATE TABLE 语句
   * @returns 分区键列名数组
   */
  private parsePartitionKeys(ddl: string): string[] {
    const keys: string[] = [];
    
    const partitionMatch = ddl.match(/PARTITIONED\s+BY\s*\(([^)]+)\)/i);
    if (partitionMatch) {
      const partitionText = partitionMatch[1];
      const parts = partitionText.split(',').map(p => p.trim());
      
      for (const part of parts) {
        const columns = part.split(/\s+/);
        if (columns.length > 0) {
          keys.push(columns[0].replace(/[`"]/g, ''));
        }
      }
    }
    
    return keys;
  }

  /**
   * 解析存储格式
   * 从 STORED AS 子句中提取存储格式类型（如 PARQUET、ORC、TEXTFILE 等）。
   * @param ddl - CREATE TABLE 语句
   * @returns 存储格式类型字符串，未指定时返回 undefined
   */
  private parseStorageFormat(ddl: string): string | undefined {
    const formatMatch = ddl.match(/STORED\s+AS\s+(\w+)/i);
    if (formatMatch) {
      return formatMatch[1].toUpperCase();
    }
    return undefined;
  }
}
