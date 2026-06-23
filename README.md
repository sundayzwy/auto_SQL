# AutoSQL - 离线 SQL 代码优化器

一款 Windows 桌面应用程序，专注于为大数据和数据库开发人员提供离线 SQL 代码优化服务。

## 功能特性

- **SQL 格式化**：自动美化 SQL 代码，支持语法高亮显示
- **性能调优建议**：基于 AST 分析和表元数据，提供深度性能优化建议
- **优化后 SQL 生成**：对可自动改写的规则，直接生成优化后的 SQL
- **表元数据管理**：支持手动导入 DDL，提升分析精度
- **多方言支持**：支持 Impala SQL 和 Oracle SQL 两种方言

## 技术栈

- Electron + React + TypeScript
- Monaco Editor（VS Code 同款编辑器）
- Zustand（状态管理）
- Tailwind CSS（样式）

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 打包

```bash
npm run pack
```

## 项目结构

```
auto_SQL/
├── src/
│   ├── main/              # Electron 主进程
│   ├── renderer/          # React 渲染进程
│   ├── engine/            # 核心分析引擎
│   │   ├── parser/        # SQL 解析
│   │   ├── formatter/     # 格式化引擎
│   │   ├── rules/         # 规则引擎
│   │   ├── metadata/      # 元数据管理
│   │   └── optimizer/     # SQL 优化生成
│   └── shared/            # 共享类型和常量
├── docs/                  # 文档
└── resources/             # 应用资源
```

## 规则列表

### 通用规则（8 条）

- R001: 避免 SELECT *
- R002: 避免笛卡尔积
- R003: 子查询改写为 JOIN
- R004: 避免在 WHERE 中对字段使用函数
- R005: LIKE 前缀通配符检测
- R006: UNION 改写为 UNION ALL
- R007: 避免隐式类型转换
- R008: EXISTS 替代 IN (子查询)

### Impala 专属规则（6 条）

- I001: 分区字段必须使用
- I002: JOIN 顺序优化
- I003: 避免数据倾斜
- I004: 使用合适的 JOIN 类型
- I005: COUNT(DISTINCT) 优化
- I006: 统计信息缺失

### Oracle 专属规则（5 条）

- O001: 索引使用检测
- O002: 避免函数包裹索引字段
- O003: 分页查询优化
- O004: 避免 OR 导致全表扫描
- O005: 提示 Hint 使用

## 许可证

MIT
