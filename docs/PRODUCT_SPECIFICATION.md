# AutoSQL 产品开发说明书

## 1. 产品概述

### 1.1 产品定位

AutoSQL 是一款基于 Electron 的 Windows 桌面端离线 SQL 代码优化器，面向大数据和数据库开发人员。用户输入 SQL 语句后，系统自动完成格式美化、基于规则引擎的性能分析，并输出优化后的 SQL 语句。全程离线运行，无需网络连接。

### 1.2 核心功能

| 功能 | 说明 |
|------|------|
| SQL 格式化 | 基于 AST 的 SQL 美化，支持关键字大小写、缩进、字段排列等可配置项 |
| 性能调优分析 | 19 条内置规则，覆盖通用 / Impala / Oracle 三种场景 |
| 优化 SQL 生成 | 对可自动改写的规则（如 SELECT * → 明确列名、UNION → UNION ALL），直接生成优化 SQL |
| 表元数据管理 | 导入 DDL 建表语句，增强分区过滤、索引使用等元数据驱动规则的检测精度 |
| 多方言支持 | Impala SQL 和 Oracle SQL 两种方言，规则按方言自动过滤 |

### 1.3 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 桌面框架 | Electron 28 | 跨平台桌面应用容器 |
| UI 框架 | React 18 + TypeScript 5.3 | 组件化 UI 开发 |
| 代码编辑器 | Monaco Editor 0.45 | SQL 语法高亮编辑 |
| 状态管理 | Zustand 4.4 | 轻量全局状态 |
| 样式 | Tailwind CSS 3.4 | 原子化 CSS |
| 构建 | Vite 5 | 渲染进程构建 |
| 打包 | electron-builder 24 | Windows 安装包生成 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌──────────────────────────────────────────────────────────────┐
│                    Electron 主进程 (main/)                      │
│                                                               │
│  createWindow()   窗口管理 (1400×900)                          │
│  setupIpc()       IPC 通信注册                                │
│  getDataDir()     数据目录管理 (~/.auto-sql/)                  │
│                                                               │
│  ┌─────────────┬──────────────┬──────────────┬─────────────┐ │
│  │ save-file   │ load-file    │ save-metadata│ save-config │ │
│  │ load-file   │ delete-metadata│ load-config │ get-log-path│ │
│  └─────────────┴──────────────┴──────────────┴─────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │ IPC (contextBridge)
┌──────────────────────▼───────────────────────────────────────┐
│                   React 渲染进程 (renderer/)                    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Toolbar  方言选择 │ 格式化 │ 性能分析 │ 导入DDL │ 重置  │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌──────────┬──────────┬──────────────┬────────────────────┐ │
│  │ SQL 输入  │ 格式化结果│  调优建议     │  优化后 SQL        │ │
│  │(Monaco)  │(Monaco)  │  (卡片列表)   │  (Monaco)          │ │
│  └──────────┴──────────┴──────────────┴────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Zustand Store (sqlStore)                                │ │
│  │  inputSql │ formattedSql │ optimizedSql │ dialect       │ │
│  │  issues   │ tables       │ formatConfig                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Hooks 层 (useSqlAnalysis)  ──  业务逻辑编排              │ │
│  │  Services 层 (sqlService)  ──  引擎调用封装               │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────┘
                       │ 直接调用（纯 TypeScript，无 IPC）
┌──────────────────────▼───────────────────────────────────────┐
│                   核心引擎 (engine/)                            │
│                                                               │
│  SQL 文本                                                    │
│    │                                                          │
│    ▼                                                          │
│  Tokenizer ──→ Token[] ──→ Parser ──→ AST                    │
│                                        │                      │
│              ┌─────────────────────────┤                      │
│              ▼                         ▼                      │
│         Formatter                  RuleEngine                 │
│         (AST → 格式化SQL)          (AST → Issue[])             │
│                                        │                      │
│                                        ▼                      │
│                                   SqlOptimizer                │
│                                   (Issue[] → 优化SQL)          │
│                                                               │
│  辅助模块:                                                    │
│  DdlParser ──→ TableMetadata ──→ MetadataManager             │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 分层架构

系统采用五层架构，自上而下依赖：

| 层 | 目录 | 职责 | 依赖方向 |
|----|------|------|----------|
| **主进程层** | `src/main/` | 窗口管理、文件 I/O、配置持久化、日志 | 仅依赖 Node.js / Electron API |
| **UI 组件层** | `src/renderer/components/` | 纯 UI 渲染，通过 Hook 获取数据和操作 | → Hooks 层 |
| **业务逻辑层** | `src/renderer/hooks/` + `services/` | 编排引擎调用与状态管理 | → Engine 层 + Store 层 |
| **状态管理层** | `src/renderer/store/` | Zustand 全局状态，驱动 UI 更新 | → Shared 层 |
| **核心引擎层** | `src/engine/` | SQL 解析、格式化、规则检查、优化 | → Shared 层 |
| **共享层** | `src/shared/` | 类型定义、常量、默认配置 | 无依赖 |

### 2.3 数据流

```
用户输入 SQL
    │
    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  格式化流程   │     │  分析流程     │     │  DDL 导入流程 │
│              │     │              │     │              │
│ Parser       │     │ Parser       │     │ DdlParser    │
│   ↓          │     │   ↓          │     │   ↓          │
│ Formatter    │     │ RuleEngine   │     │ TableMetadata│
│   ↓          │     │   ↓          │     │   ↓          │
│ formattedSql │     │ Issue[]      │     │ addTable()   │
│              │     │   ↓          │     │              │
│              │     │ SqlOptimizer │     │              │
│              │     │   ↓          │     │              │
│              │     │ optimizedSql │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 3. 模块功能详解

### 3.1 词法分析器（Tokenizer）

**文件**: `src/engine/parser/Tokenizer.ts`

将 SQL 字符串拆分为 Token 序列，是解析流程的第一步。

- 逐字符扫描，识别 8 种 Token 类型：KEYWORD、IDENTIFIER、NUMBER、STRING、OPERATOR、PUNCTUATION、COMMENT、EOF
- 支持单行注释 `--` 和块注释 `/* */`
- 支持字符串转义引号 `''` 和 `""`
- 支持双字符操作符 `<=`、`>=`、`<>`、`!=`、`||`、`&&`
- 关键字通过 `SQL_KEYWORDS` 集合（约 100+ 关键字）进行区分
- 每个 Token 携带行号、列号位置信息

### 3.2 语法分析器（Parser）

**文件**: `src/engine/parser/Parser.ts`

采用递归下降策略将 Token 序列解析为 AST。

**支持的语句**：
- SELECT（含 FROM、WHERE、JOIN、GROUP BY、HAVING、ORDER BY、LIMIT、子查询）
- INSERT（含 VALUES 和 INSERT...SELECT 两种形式）
- CREATE TABLE
- UPDATE / DELETE（基本支持）

**表达式优先级**（从低到高）：
```
OR → AND → NOT → 比较运算(=, <, >, IN, BETWEEN, LIKE, IS NULL)
→ 加减运算(+, -, ||) → 乘除运算(*, /, %) → 一元运算(-, +)
→ 基本表达式(字面量、函数调用、列引用、子查询)
```

**AST 节点类型**：SelectStatement、FromClause、WhereClause、JoinClause、GroupByClause、OrderByClause、SelectList、ColumnRef、TableRef、FunctionCall、Subquery、Literal、Expression、Condition 等 20 种。

### 3.3 格式化器（Formatter）

**文件**: `src/engine/formatter/Formatter.ts`

基于 AST 遍历生成格式化 SQL 文本。

**可配置项**：
| 配置项 | 可选值 | 默认值 |
|--------|--------|--------|
| keywordCase | `upper` / `lower` | `upper` |
| indentSize | `2` / `4` | `2` |
| fieldListStyle | `each-line` / `compact` | `each-line` |
| whereClauseStyle | `each-line` / `compact` | `each-line` |
| subqueryIndent | `block` / `inline` | `block` |

**格式化流程**：先调用 Parser 解析 SQL 为 AST，再递归遍历 AST 节点，每个节点类型对应一个 `format*` 方法，按配置拼接输出。

### 3.4 规则引擎（RuleEngine）

**文件**: `src/engine/rules/RuleEngine.ts` + 19 个规则文件

采用策略模式，每条规则继承抽象 `Rule` 基类。

**Rule 基类接口**：
```typescript
abstract class Rule {
  abstract id: string;          // 规则编号，如 R001
  abstract name: string;        // 中文名称
  abstract description: string; // 规则说明
  abstract severity: 'error' | 'warning' | 'info';  // 严重级别
  abstract dialects: ('impala' | 'oracle')[];        // 适用方言
  abstract analyze(ast: ASTNode, metadata?: Map<string, TableMetadata>): Issue[];
}
```

**执行流程**：遍历所有注册规则 → 按方言过滤 → 逐一调用 `rule.analyze(ast, metadata)` → 收集 Issue 列表。

#### 通用规则（8 条）

| ID | 规则名称 | 严重级别 | 检测内容 |
|----|---------|---------|---------|
| R001 | 避免 SELECT * | warning | 检测 SelectList 中的 `*` 通配符 |
| R002 | 避免笛卡尔积 | error | 检测 FROM 中多表但缺少 JOIN ON 条件 |
| R003 | 子查询改写为 JOIN | warning | 检测 WHERE 中 IN (SELECT...) 模式 |
| R004 | 避免 WHERE 中对字段使用函数 | warning | 检测 YEAR()、UPPER() 等函数包裹列引用 |
| R005 | LIKE 前导通配符 | warning | 检测 LIKE '%xxx' 模式 |
| R006 | UNION 改写为 UNION ALL | info | 检测 UNION 可替换为 UNION ALL |
| R007 | 避免隐式类型转换 | warning | 检测字符串与数字比较等模式 |
| R008 | EXISTS 替代 IN 子查询 | info | 检测 IN (子查询) 可改写为 EXISTS |

#### Impala 规则（6 条）

| ID | 规则名称 | 严重级别 | 检测内容 |
|----|---------|---------|---------|
| I001 | 分区字段必须使用 | warning | 基于元数据检测分区表缺少分区过滤 |
| I002 | JOIN 顺序优化 | info | 基于元数据建议大表在前 |
| I003 | 避免数据倾斜 | warning | 检测 JOIN 键和 GROUP BY 键分布 |
| I004 | 使用合适的 JOIN 类型 | info | 建议 BROADCAST/SHUFFLE hint |
| I005 | COUNT(DISTINCT) 优化 | warning | 检测多列 COUNT(DISTINCT) |
| I006 | 统计信息缺失 | info | 建议执行 COMPUTE STATS |

#### Oracle 规则（5 条）

| ID | 规则名称 | 严重级别 | 检测内容 |
|----|---------|---------|---------|
| O001 | 索引使用检测 | warning | 基于元数据检测 WHERE 字段是否缺少索引 |
| O002 | 避免函数包裹索引字段 | warning | 检测索引列上的函数调用 |
| O003 | 分页查询优化 | warning | 检测 ROWNUM 分页模式，建议 ROW_NUMBER() |
| O004 | 避免 OR 导致全表扫描 | warning | 检测 WHERE 中 OR 条件模式 |
| O005 | Hint 使用建议 | info | 检测是否合理使用 Hint |

### 3.5 SQL 优化器（SqlOptimizer）

**文件**: `src/engine/optimizer/SqlOptimizer.ts`

基于 Issue 列表对原始 SQL 进行自动改写，目前支持：

- **R001 SELECT * 替换**：`SELECT *` → `SELECT /* TODO: specify columns */`
- **R006 UNION → UNION ALL**：正则替换 `UNION` 为 `UNION ALL`
- **R004 函数优化**：`YEAR(col) = 2024` → `col >= '2024-01-01' AND col < '2025-01-01'`
- **diff 生成**：`generateDiff()` 方法对比原始 SQL 与优化后 SQL 的行级差异

### 3.6 元数据管理

**DdlParser** (`src/engine/metadata/DdlParser.ts`)：
- 按分号分割多条 DDL 语句（处理字符串内分号）
- 正则匹配 `CREATE TABLE` 提取表名、列定义、分区键、存储格式
- 支持 `IF NOT EXISTS` 语法

**MetadataManager** (`src/engine/metadata/MetadataManager.ts`)：
- 基于 Map 存储表元数据，提供增删查清空操作
- 支持 JSON 序列化/反序列化，用于持久化

### 3.7 渲染进程

| 组件 | 文件 | 功能 |
|------|------|------|
| App | `App.tsx` | 根组件，四栏 Flexbox 布局 |
| Toolbar | `components/Toolbar/` | 方言切换、格式化/分析/导入DDL/重置按钮 |
| SqlInput | `components/SqlInput/` | Monaco Editor 可编辑 SQL 输入区 |
| FormattedOutput | `components/FormattedOutput/` | Monaco Editor 只读格式化结果 |
| SuggestionPanel | `components/SuggestionPanel/` | 按严重级别着色的问题卡片列表 |
| OptimizedOutput | `components/OptimizedOutput/` | Monaco Editor 只读优化后 SQL |
| sqlStore | `store/sqlStore.ts` | Zustand 全局状态管理 |
| sqlService | `services/sqlService.ts` | 引擎调用封装层 |
| useSqlAnalysis | `hooks/useSqlAnalysis.ts` | 业务逻辑编排 Hook |

### 3.8 主进程

**文件**: `src/main/index.js` + `src/main/preload.js`

- 窗口创建：1400×900，最小 1000×700
- 8 个 IPC 通道：文件保存/加载、元数据 CRUD 持久化、用户配置读写、日志管理
- 数据目录：`{userData}/.auto-sql/metadata/` 和 `{userData}/.auto-sql/config.json`
- 安全：`contextIsolation: true` + `nodeIntegration: false`，通过 `contextBridge` 暴露 API

---

## 4. 目录结构

```
auto_SQL/
├── package.json                    # 项目配置与依赖
├── tsconfig.json                   # 主 TypeScript 配置
├── tsconfig.main.json              # 主进程 TypeScript 配置
├── tsconfig.node.json              # Vite Node 环境配置
├── vite.config.ts                  # Vite 构建配置
├── tailwind.config.js              # Tailwind 主题配置
├── postcss.config.js               # PostCSS 配置
├── electron-builder.json           # Electron 打包配置
├── .eslintrc.js                    # ESLint 规则
├── .gitignore                      # Git 忽略规则
├── README.md                       # 项目说明
│
├── docs/
│   └── superpowers/specs/          # 设计文档与实施计划
│
├── test-data/                      # 测试数据集
│   ├── sample-queries.sql          # 18 个测试场景 SQL
│   ├── sample-ddl.sql              # 8 个建表 DDL 语句
│   └── README.md                   # 测试数据说明
│
├── resources/                      # 应用图标等资源
│
└── src/
    ├── main/                       # ── Electron 主进程 ──
    │   ├── index.js                # 应用入口，窗口管理，IPC 注册
    │   └── preload.js              # contextBridge 安全 API 暴露
    │
    ├── renderer/                   # ── React 渲染进程 ──
    │   ├── index.html              # HTML 入口
    │   ├── main.tsx                # React 挂载入口
    │   ├── App.tsx                 # 根组件（四栏布局）
    │   ├── components/             # UI 组件
    │   │   ├── index.ts            # 组件统一导出
    │   │   ├── Toolbar/index.tsx   # 工具栏
    │   │   ├── SqlInput/index.tsx  # SQL 输入面板
    │   │   ├── FormattedOutput/index.tsx  # 格式化结果
    │   │   ├── SuggestionPanel/index.tsx  # 调优建议
    │   │   └── OptimizedOutput/index.tsx  # 优化后 SQL
    │   ├── hooks/                  # 自定义 Hook
    │   │   ├── index.ts            # Hook 统一导出
    │   │   └── useSqlAnalysis.ts   # SQL 分析业务逻辑 Hook
    │   ├── services/               # 服务层
    │   │   ├── index.ts            # 服务统一导出
    │   │   └── sqlService.ts       # 引擎调用封装
    │   ├── store/
    │   │   └── sqlStore.ts         # Zustand 全局状态
    │   └── styles/
    │       └── global.css          # Tailwind + 全局样式
    │
    ├── engine/                     # ── 核心引擎 ──
    │   ├── index.ts                # 引擎统一导出
    │   ├── parser/
    │   │   ├── index.ts
    │   │   ├── Tokenizer.ts        # 词法分析器
    │   │   └── Parser.ts           # 递归下降语法分析器
    │   ├── formatter/
    │   │   ├── index.ts
    │   │   └── Formatter.ts        # SQL 格式化器
    │   ├── rules/
    │   │   ├── index.ts
    │   │   ├── Rule.ts             # 抽象规则基类
    │   │   ├── RuleEngine.ts       # 规则引擎
    │   │   ├── common/             # 8 条通用规则 (R001-R008)
    │   │   ├── impala/             # 6 条 Impala 规则 (I001-I006)
    │   │   └── oracle/             # 5 条 Oracle 规则 (O001-O005)
    │   ├── metadata/
    │   │   ├── index.ts
    │   │   ├── DdlParser.ts        # DDL 解析器
    │   │   └── MetadataManager.ts  # 元数据管理器
    │   └── optimizer/
    │       ├── index.ts
    │       └── SqlOptimizer.ts     # SQL 优化生成器
    │
    └── shared/                     # ── 共享模块 ──
        ├── types.ts                # 类型定义、IPC 通道、默认配置
        └── constants.ts            # SQL 关键字、函数、操作符集合
```

---

## 5. 潜在优化空间

### 5.1 解析引擎增强

| 优化项 | 当前状态 | 目标 | 优先级 |
|--------|---------|------|--------|
| 方言感知解析 | Parser 不区分方言，统一解析 | 支持 Impala/Oracle 特有语法差异解析 | 高 |
| 错误恢复 | 遇到语法错误直接终止 | 实现 panic-mode 错误恢复，尽可能多地报告错误 | 高 |
| DDL 完整语法 | 仅解析列名和类型 | 支持 COMMENT、DEFAULT、约束、索引等完整 DDL | 中 |
| 子查询深度 | 支持基本嵌套 | 增强 CTE (WITH)、窗口函数、LATERAL VIEW 等复杂语法 | 中 |
| 替代解析方案 | 手写递归下降 | 评估引入 ANTLR4 生成解析器，减少维护成本 | 低 |

### 5.2 规则引擎扩展

| 优化项 | 当前状态 | 目标 | 优先级 |
|--------|---------|------|--------|
| 规则配置化 | 规则硬编码在代码中 | 支持 JSON/YAML 配置文件定义规则，无需修改代码即可新增规则 | 高 |
| 规则热加载 | 规则在构造时注册 | 支持运行时动态加载/卸载规则 | 中 |
| 规则优先级 | 无优先级，顺序执行 | 按严重级别和规则类型排序输出 | 中 |
| 自定义规则 | 不支持 | 提供 DSL 或配置接口让用户自定义规则 | 低 |
| 更多方言 | 仅 Impala 和 Oracle | 扩展 MySQL、PostgreSQL、Hive、Spark SQL 等 | 低 |

### 5.3 SQL 优化器增强

| 优化项 | 当前状态 | 目标 | 优先级 |
|--------|---------|------|--------|
| AST 级改写 | 基于正则替换 | 基于 AST 节点进行精确改写，避免误替换 | 高 |
| 子查询改写 | 不支持 | 实现 IN → EXISTS、子查询 → JOIN 的 AST 级别自动改写 | 高 |
| 多规则组合优化 | 串行应用，可能冲突 | 建立优化规则优先级和冲突解决机制 | 中 |
| 优化前后对比 | 仅行级 diff | 实现 Monaco Diff Editor 并排对比 | 中 |
| 优化回滚 | 不支持 | 支持单步撤销/重做优化操作 | 低 |

### 5.4 元数据增强

| 优化项 | 当前状态 | 目标 | 优先级 |
|--------|---------|------|--------|
| 数据库连接 | 仅手动导入 DDL | 支持 JDBC/ODBC 直连数据库，自动获取表结构 | 高 |
| 统计信息 | 不支持 | 记录表大小、行数、分区数等统计信息，辅助 JOIN 顺序优化 | 中 |
| 索引信息 | TableMetadata 已预留字段 | 从 DDL 或数据库自动提取索引定义 | 中 |
| 元数据导入格式 | 仅 DDL 文本 | 支持 Excel/CSV 导入表结构 | 低 |

### 5.5 UI/UX 增强

| 优化项 | 当前状态 | 目标 | 优先级 |
|--------|---------|------|--------|
| Monaco Diff 对比 | 无 | 并排显示优化前后 SQL 差异 | 高 |
| 问题定位跳转 | 仅显示行号 | 点击 Issue 自动跳转到 Moncao Editor 对应位置并高亮 | 高 |
| 格式化配置 UI | 不支持 | 设置面板让用户自定义格式化参数 | 中 |
| 暗色主题 | 仅编辑器暗色 | 全局暗色主题支持 | 中 |
| 多标签页 | 单 SQL 编辑 | 支持多标签页同时编辑多个 SQL | 中 |
| 历史记录 | 不支持 | 保存最近的 SQL 和分析结果，支持回溯 | 低 |
| 国际化 | 仅中文 | 支持中英文切换 | 低 |

### 5.6 工程化增强

| 优化项 | 当前状态 | 目标 | 优先级 |
|--------|---------|------|--------|
| 单元测试 | 无 | 为 Tokenizer、Parser、RuleEngine 等核心模块编写单元测试 | 高 |
| CI/CD | 无 | GitHub Actions 自动化构建、测试和发布 | 高 |
| 代码分包 | 引擎与 UI 同包 | 引擎拆分为独立 npm 包，可被其他项目引用 | 中 |
| 错误监控 | 无 | 集成 Sentry 或自定义日志上报 | 中 |
| E2E 测试 | 无 | 使用 Playwright 编写端到端测试 | 中 |
| macOS 支持 | 仅 Windows | 扩展 electron-builder 配置支持 macOS 打包 | 低 |

### 5.7 性能优化

| 优化项 | 当前状态 | 目标 | 优先级 |
|--------|---------|------|--------|
| AST 缓存 | 每次格式化/分析重新解析 | 缓存解析结果，inputSql 不变时复用 | 中 |
| 增量分析 | 全量重新分析 | 仅对修改部分重新分析 | 低 |
| Worker 线程 | 主线程执行 | 将耗时解析放到 Web Worker，避免 UI 阻塞 | 低 |
| 大 SQL 性能 | 未优化 | 对超长 SQL（>1000 行）进行性能测试和优化 | 低 |

---

## 6. 版本规划建议

### v1.1（短期）
- 修复已知 Bug
- 补充单元测试（核心模块覆盖率 > 80%）
- 问题定位跳转功能
- 格式化配置 UI

### v1.2（中期）
- AST 级 SQL 改写（替换正则）
- 数据库连接支持
- 更多方言（MySQL、PostgreSQL）
- CI/CD 流水线

### v2.0（长期）
- 规则配置化
- 自定义规则
- 引擎独立 npm 包
- macOS / Linux 打包支持