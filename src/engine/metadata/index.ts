/**
 * 元数据管理模块
 * 提供 DDL 解析和表元数据管理功能。
 * DdlParser 负责从 DDL 语句中提取表结构信息，
 * MetadataManager 负责存储、查询和管理表元数据。
 */
export { DdlParser } from './DdlParser';
export { MetadataManager } from './MetadataManager';
