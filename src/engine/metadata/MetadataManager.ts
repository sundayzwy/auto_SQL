import { TableMetadata } from '../../shared/types';

/**
 * 元数据管理器
 * 管理所有已导入的表元数据，提供增删查改、序列化/反序列化等功能。
 * 内部使用 Map 存储，以表名（小写）为键，支持快速查找。
 */
export class MetadataManager {
  /** 表元数据存储，键为小写表名 */
  private tables: Map<string, TableMetadata> = new Map();

  /**
   * 添加表元数据
   * 表名在存储时会自动转为小写以避免大小写敏感问题。
   * @param metadata - 表元数据对象
   */
  addTable(metadata: TableMetadata): void {
    this.tables.set(metadata.tableName.toLowerCase(), metadata);
  }

  /**
   * 移除表元数据
   * 表名在匹配时会自动转为小写。
   * @param tableName - 要移除的表名
   */
  removeTable(tableName: string): void {
    this.tables.delete(tableName.toLowerCase());
  }

  /**
   * 根据表名查询表元数据
   * 表名在匹配时会自动转为小写。
   * @param tableName - 表名
   * @returns 表元数据对象，未找到时返回 undefined
   */
  getTable(tableName: string): TableMetadata | undefined {
    return this.tables.get(tableName.toLowerCase());
  }

  /**
   * 获取所有表元数据
   * @returns 所有已存储的表元数据数组
   */
  getAllTables(): TableMetadata[] {
    return Array.from(this.tables.values());
  }

  /**
   * 清空所有表元数据
   */
  clear(): void {
    this.tables.clear();
  }

  /**
   * 将当前所有表元数据序列化为 JSON 字符串
   * 用于数据持久化或导出。
   * @returns 格式化的 JSON 字符串
   */
  toJSON(): string {
    const data: Record<string, TableMetadata> = {};
    for (const [key, value] of this.tables.entries()) {
      data[key] = value;
    }
    return JSON.stringify(data, null, 2);
  }

  /**
   * 从 JSON 字符串反序列化并加载表元数据
   * 会先清空现有数据再导入。解析失败时仅输出错误日志，不影响现有数据。
   * @param json - JSON 字符串
   */
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
