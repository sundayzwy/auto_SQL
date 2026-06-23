# AutoSQL 实施计划

## 项目概述

基于设计文档，本实施计划将 AutoSQL 离线 SQL 代码优化器分为 6 个阶段实施，预计总工期 12-16 周。

---

## 阶段划分

### 阶段 1：项目初始化与基础设施（第 1-2 周）

**目标**：搭建项目骨架，配置开发环境，建立基础架构。

#### 任务清单

- [ ] **1.1 初始化 Electron + React + TypeScript 项目**
  - 使用 `create-electron-react` 或手动搭建
  - 配置 Vite 作为前端构建工具
  - 配置 TypeScript strict 模式
  - 设置路径别名（`@/` 指向 `src/`）

- [ ] **1.2 配置开发工具链**
  - ESLint + Prettier（代码规范）
  - Husky + lint-staged（提交前检查）
  - Commitlint（Conventional Commits）

- [ ] **1.3 配置 Tailwind CSS**
  - 安装并配置 Tailwind
  - 创建基础主题配置

- [ ] **1.4 搭建项目目录结构**
  ```
  src/
  ├── main/          # Electron 主进程
  ├── renderer/      # React 渲染进程
  ├── engine/        # 核心分析引擎
  └── shared/        # 共享类型和常量
  ```

- [ ] **1.5 配置 Electron 主进程基础功能**
  - 窗口创建和管理
  - IPC 通信基础
  - 开发环境热重载

- [ ] **1.6 配置测试框架**
  - Jest + React Testing Library
  - 配置测试覆盖率报告

**验收标准**：
- 项目可以正常启动
- 开发环境热重载正常工作
- 测试框架可以运行

---

### 阶段 2：SQL 解析引擎开发（第 3-5 周）

**目标**：实现 SQL 解析核心，支持 Impala 和 Oracle 两种方言。

#### 任务清单

- [ ] **2.1 集成 ANTLR4 运行时**
  - 安装 `antlr4ts`（TypeScript 版本）
  - 配置 ANTLR4 工具链

- [ ] **2.2 开发 Impala SQL Grammar**
  - 编写 `ImpalaSql.g4` 语法文件
  - 覆盖 SELECT/INSERT/CREATE/ALTER/DROP 语句
  - 支持 Impala 特有语法（PARTITIONED BY、STORED AS 等）
  - 生成 Lexer 和 Parser

- [ ] **2.3 开发 Oracle SQL Grammar**
  - 编写 `OracleSql.g4` 语法文件
  - 覆盖常用 Oracle 语法
  - 支持 Oracle 特有函数和 Hint
  - 生成 Lexer 和 Parser

- [ ] **2.4 实现 AST 遍历器**
  - 创建 `AstVisitor` 基类
  - 实现 AST 节点类型定义
  - 提供便捷的遍历方法

- [ ] **2.5 实现 ImpalaSqlParser 和 OracleSqlParser**
  - 封装 ANTLR4 解析逻辑
  - 提供统一的 API 接口
  - 错误处理和错误信息提取

- [ ] **2.6 编写解析器单元测试**
  - 测试各种 SQL 语句解析
  - 测试错误处理
  - 测试边界情况

**验收标准**：
- 可以正确解析 Impala 和 Oracle SQL
- 解析错误时能给出有意义的错误信息
- 单元测试覆盖率 > 80%

---

### 阶段 3：格式化引擎开发（第 6-7 周）

**目标**：实现 SQL 格式化功能，支持语法高亮和多种配置选项。

#### 任务清单

- [ ] **3.1 设计格式化引擎架构**
  - 定义 `Formatter` 接口
  - 设计格式化配置类型

- [ ] **3.2 实现 ImpalaFormatter**
  - 基于 AST 生成格式化 SQL
  - 支持关键字大小写配置
  - 支持缩进配置
  - 支持换行风格配置

- [ ] **3.3 实现 OracleFormatter**
  - 基于 AST 生成格式化 SQL
  - 支持 Oracle 特有语法格式化

- [ ] **3.4 实现 Monaco Editor 集成**
  - 安装 `@monaco-editor/react`
  - 配置 SQL 语法高亮
  - 实现只读模式（用于输出窗口）

- [ ] **3.5 开发格式化配置 UI**
  - 设置面板
  - 配置项保存和加载

- [ ] **3.6 编写格式化引擎单元测试**
  - 测试各种格式化配置
  - 测试边界情况

**验收标准**：
- SQL 格式化后语法高亮正确
- 各种配置选项生效
- 单元测试覆盖率 > 80%

---

### 阶段 4：规则引擎开发（第 8-10 周）

**目标**：实现性能调优规则引擎，支持 19 条规则（8 通用 + 6 Impala + 5 Oracle）。

#### 任务清单

- [ ] **4.1 设计规则引擎架构**
  - 定义 `Rule` 基类
  - 定义 `Issue` 类型
  - 设计 `RuleEngine` 接口

- [ ] **4.2 实现规则执行器**
  - 规则加载和注册
  - 规则执行流程
  - 错误处理

- [ ] **4.3 实现通用规则（R001-R008）**
  - R001: 避免 SELECT *
  - R002: 避免笛卡尔积
  - R003: 子查询改写为 JOIN
  - R004: 避免在 WHERE 中对字段使用函数
  - R005: LIKE 前缀通配符检测
  - R006: UNION 改写为 UNION ALL
  - R007: 避免隐式类型转换
  - R008: EXISTS 替代 IN (子查询)

- [ ] **4.4 实现 Impala 专属规则（I001-I006）**
  - I001: 分区字段必须使用
  - I002: JOIN 顺序优化
  - I003: 避免数据倾斜
  - I004: 使用合适的 JOIN 类型
  - I005: COUNT(DISTINCT) 优化
  - I006: 统计信息缺失

- [ ] **4.5 实现 Oracle 专属规则（O001-O005）**
  - O001: 索引使用检测
  - O002: 避免函数包裹索引字段
  - O003: 分页查询优化
  - O004: 避免 OR 导致全表扫描
  - O005: 提示 Hint 使用

- [ ] **4.6 实现 SQL 优化生成器**
  - 对可自动改写的规则生成优化后 SQL
  - Diff 视图支持

- [ ] **4.7 编写规则引擎单元测试**
  - 每条规则的触发条件测试
  - 建议输出测试
  - 优化后 SQL 正确性测试

**验收标准**：
- 19 条规则全部实现
- 规则触发准确
- 优化后 SQL 正确
- 单元测试覆盖率 > 80%

---

### 阶段 5：元数据管理与 UI 开发（第 11-13 周）

**目标**：实现表元数据管理功能和完整的用户界面。

#### 任务清单

- [ ] **5.1 实现 DDL 解析器**
  - 解析 CREATE TABLE 语句
  - 提取表名、字段、类型、分区键等信息
  - 支持 Impala 和 Oracle DDL

- [ ] **5.2 实现元数据管理器**
  - 元数据存储（本地 JSON 文件）
  - 元数据加载和缓存
  - 元数据导出/导入

- [ ] **5.3 开发四窗口 UI 布局**
  - SQL 输入窗口（Monaco Editor）
  - 格式化结果窗口（Monaco Editor 只读）
  - 调优建议窗口（卡片列表）
  - 优化后 SQL 窗口（Monaco Diff 视图）
  - 窗口拖拽调整大小

- [ ] **5.4 开发顶部工具栏**
  - 方言选择下拉框
  - 格式化按钮
  - 性能分析按钮
  - 导入 DDL 按钮
  - 设置按钮
  - 重置布局按钮

- [ ] **5.5 开发 DDL 导入弹窗**
  - 文本输入区域
  - 解析结果预览
  - 确认导入

- [ ] **5.6 开发设置面板**
  - 格式化偏好配置
  - 规则开关配置
  - 元数据管理界面

- [ ] **5.7 实现状态管理**
  - 使用 Zustand 管理全局状态
  - SQL 输入/输出状态
  - 元数据状态
  - 配置状态

- [ ] **5.8 实现 IPC 通信**
  - 主进程与渲染进程通信
  - 文件读写操作
  - 元数据持久化

**验收标准**：
- UI 布局符合设计
- 四窗口可拖拽调整
- DDL 导入功能正常
- 设置保存和加载正常

---

### 阶段 6：测试、优化与打包发布（第 14-16 周）

**目标**：完成测试、性能优化，打包发布 Windows 安装程序。

#### 任务清单

- [ ] **6.1 集成测试**
  - 端到端流程测试
  - 元数据导入 → 规则分析联动测试

- [ ] **6.2 性能优化**
  - 大 SQL 处理优化（1000+ 行）
  - 规则引擎异步执行（Web Worker）
  - 缓存机制实现（LRU 缓存）

- [ ] **6.3 错误处理完善**
  - 各种错误场景测试
  - 用户提示优化
  - 日志记录完善

- [ ] **6.4 用户体验优化**
  - Toast 通知
  - 加载状态提示
  - 错误定位和跳转

- [ ] **6.5 配置 Electron Builder**
  - 打包配置
  - 图标和资源
  - NSIS 安装程序配置

- [ ] **6.6 打包测试**
  - Windows 安装程序测试
  - 免安装便携版测试
  - 跨 Windows 版本测试

- [ ] **6.7 编写用户文档**
  - 安装指南
  - 使用手册
  - 常见问题

- [ ] **6.8 发布准备**
  - 版本号管理
  - 发布说明
  - 分发渠道准备

**验收标准**：
- 所有测试通过
- 性能满足要求（大 SQL 不卡顿）
- 打包成功，可正常安装运行
- 用户文档完整

---

## 里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| M1: 项目初始化完成 | 第 2 周末 | 可运行的项目骨架 |
| M2: SQL 解析引擎完成 | 第 5 周末 | 可解析 Impala/Oracle SQL |
| M3: 格式化引擎完成 | 第 7 周末 | 可格式化 SQL 并高亮显示 |
| M4: 规则引擎完成 | 第 10 周末 | 19 条规则全部实现 |
| M5: UI 和元数据管理完成 | 第 13 周末 | 完整功能可演示 |
| M6: 发布就绪 | 第 16 周末 | Windows 安装程序 |

---

## 风险与应对

### 风险 1：ANTLR4 Grammar 开发难度

**风险描述**：Impala 和 Oracle SQL 语法复杂，Grammar 开发可能超预期。

**应对措施**：
- 先实现常用语法，后续迭代完善
- 参考社区已有的 Grammar 文件
- 预留 1-2 周缓冲时间

### 风险 2：规则准确性

**风险描述**：规则可能产生误报或漏报。

**应对措施**：
- 每条规则配套单元测试
- 收集真实 SQL 样本测试
- 提供规则开关，用户可禁用特定规则

### 风险 3：性能问题

**风险描述**：大 SQL 解析和规则执行可能卡顿。

**应对措施**：
- 规则引擎在 Web Worker 中运行
- 实现缓存机制
- 大 SQL 显示进度提示

---

## 资源需求

### 人员配置

- **前端开发**：1 人（React + Electron）
- **后端开发**：1 人（SQL 解析 + 规则引擎）
- **测试**：0.5 人（可兼任）

如果人员紧张，可由全栈开发独立完成，工期延长至 20 周。

### 技术资源

- ANTLR4 运行时（开源）
- Monaco Editor（开源）
- Electron（开源）
- 开发环境：Node.js 18+、TypeScript 5+

---

## 附录：关键代码示例

### A. 规则基类定义

```typescript
// src/engine/rules/Rule.ts
export abstract class Rule {
  abstract id: string;
  abstract severity: 'warning' | 'error' | 'info';
  abstract title: string;
  abstract dialects: ('impala' | 'oracle')[];

  abstract analyze(ast: AST, metadata: Metadata): Issue[];
}

export interface Issue {
  ruleId: string;
  severity: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  location: { line: number; column: number };
  suggestion: string;
  optimizedSql?: string;
}
```

### B. 规则示例

```typescript
// src/engine/rules/common/R001_AvoidSelectStar.ts
export class R001_AvoidSelectStar extends Rule {
  id = 'R001';
  severity = 'warning';
  title = '避免 SELECT *';
  dialects = ['impala', 'oracle'];

  analyze(ast: AST, metadata: Metadata): Issue[] {
    const issues: Issue[] = [];
    
    // 遍历 AST 查找 SELECT *
    ast.visit({
      visitSelectStatement: (ctx) => {
        if (ctx.selectList().getText() === '*') {
          issues.push({
            ruleId: this.id,
            severity: this.severity,
            title: this.title,
            description: '建议明确列出需要的字段，减少 IO',
            location: { line: ctx.start.line, column: ctx.start.column },
            suggestion: '将 SELECT * 改为明确的字段列表',
          });
        }
      }
    });
    
    return issues;
  }
}
```

### C. 状态管理示例

```typescript
// src/renderer/store/sqlStore.ts
import { create } from 'zustand';

interface SqlState {
  inputSql: string;
  formattedSql: string;
  optimizedSql: string;
  dialect: 'impala' | 'oracle';
  issues: Issue[];
  
  setInputSql: (sql: string) => void;
  setFormattedSql: (sql: string) => void;
  setOptimizedSql: (sql: string) => void;
  setDialect: (dialect: 'impala' | 'oracle') => void;
  setIssues: (issues: Issue[]) => void;
}

export const useSqlStore = create<SqlState>((set) => ({
  inputSql: '',
  formattedSql: '',
  optimizedSql: '',
  dialect: 'impala',
  issues: [],
  
  setInputSql: (sql) => set({ inputSql: sql }),
  setFormattedSql: (sql) => set({ formattedSql: sql }),
  setOptimizedSql: (sql) => set({ optimizedSql: sql }),
  setDialect: (dialect) => set({ dialect }),
  setIssues: (issues) => set({ issues }),
}));
```

---

**文档版本**：v1.0  
**创建日期**：2026-06-24  
**最后更新**：2026-06-24
