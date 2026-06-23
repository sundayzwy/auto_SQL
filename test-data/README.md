# AutoSQL 测试数据

## 使用方式

1. 启动 AutoSQL 应用后，在左侧 **SQL 输入**面板中粘贴 `sample-queries.sql` 中的 SQL 语句
2. 点击工具栏 **格式化** 按钮查看格式化效果
3. 点击 **性能分析** 按钮查看调优建议
4. 点击 **导入 DDL**，粘贴 `sample-ddl.sql` 中的建表语句，导入元数据后重新分析

## 文件说明

- `sample-queries.sql` - 包含 18 个测试场景，覆盖全部 8 条通用规则和多种语句类型
- `sample-ddl.sql` - 包含 8 个建表语句，用于测试 DDL 解析和元数据驱动规则