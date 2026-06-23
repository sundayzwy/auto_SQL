import { ColumnDefinition, SqlDialect, TableMetadata } from '../../shared/types';

export class DdlParser {
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

  private parseCreateTable(ddl: string, dialect: SqlDialect): TableMetadata | null {
    const upperDdl = ddl.toUpperCase();
    
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

  private parseStorageFormat(ddl: string): string | undefined {
    const formatMatch = ddl.match(/STORED\s+AS\s+(\w+)/i);
    if (formatMatch) {
      return formatMatch[1].toUpperCase();
    }
    return undefined;
  }
}
