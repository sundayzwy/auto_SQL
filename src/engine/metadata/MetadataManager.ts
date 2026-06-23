import { TableMetadata } from '../../shared/types';

export class MetadataManager {
  private tables: Map<string, TableMetadata> = new Map();

  addTable(metadata: TableMetadata): void {
    this.tables.set(metadata.tableName.toLowerCase(), metadata);
  }

  removeTable(tableName: string): void {
    this.tables.delete(tableName.toLowerCase());
  }

  getTable(tableName: string): TableMetadata | undefined {
    return this.tables.get(tableName.toLowerCase());
  }

  getAllTables(): TableMetadata[] {
    return Array.from(this.tables.values());
  }

  clear(): void {
    this.tables.clear();
  }

  toJSON(): string {
    const data: Record<string, TableMetadata> = {};
    for (const [key, value] of this.tables.entries()) {
      data[key] = value;
    }
    return JSON.stringify(data, null, 2);
  }

  fromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      this.tables.clear();
      for (const [key, value] of Object.entries(data)) {
        this.tables.set(key, value as TableMetadata);
      }
    } catch (error) {
      console.error('Failed to parse metadata JSON:', error);
    }
  }
}
