# AutoSQL - 离线 SQL 代码优化器

一款 Windows 桌面应用程序，专注于为大数据和数据库开发人员提供离线 SQL 代码优化服务。

## 下载与使用

### 1. 下载安装包

前往 [Releases 页面](https://github.com/sundayzwy/auto_SQL/releases) 下载最新版本的可执行文件：

- 下载 `AutoSQL-1.0.0-portable.exe`（Windows x64，便携版单文件，约 100 MB 左右）

### 2. 系统要求

| 项目 | 要求 |
|------|------|
| 操作系统 | Windows 10 / 11（x64） |
| 架构 | 64 位 |
| 磁盘空间 | 约 300 MB（含运行时解压） |
| 网络 | **无需联网**，全程离线运行 |

### 3. 运行方式

AutoSQL 为 **便携版（Portable）**，**无需安装**，双击 `.exe` 即可直接运行：

1. 将下载的 `AutoSQL-1.0.0-portable.exe` 放到任意目录（建议放在固定的工具目录下，例如 `D:\Tools\AutoSQL\`）
2. 双击运行即可启动应用
3. 首次启动 Windows SmartScreen 提示时，点击「**更多信息**」→「**仍要运行**」

> 💡 便携版特点：所有数据保存在用户目录 `~/.auto-sql/` 下，**不会写入注册表**、**不会污染系统目录**，删除 EXE 即彻底卸载。

### 4. 快速上手

1. 启动后默认进入主界面，左侧是 SQL 编辑区
2. 顶部工具栏选择 **方言**（Impala / Oracle）
3. 在编辑区粘贴或输入 SQL
4. 点击工具栏的 **「格式化」** → 右侧查看美化结果
5. 点击 **「性能分析」** → 查看调优建议卡片
6. 点击 **「导入DDL」** → 上传建表语句以提升分析精度
7. 优化建议中标记为「可自动改写」的规则，会在右下角自动生成 **优化后 SQL**

### 5. 数据存储位置

| 内容 | 路径 |
|------|------|
| 用户数据 | `C:\Users\<你的用户名>\.auto-sql\` |
| 日志文件 | `C:\Users\<你的用户名>\.auto-sql\logs\` |
| 导入的 DDL | `C:\Users\<你的用户名>\.auto-sql\metadata\` |

如需重置应用，关闭程序后删除整个 `.auto-sql` 目录即可。

### 6. 遇到问题？

- **应用无法启动**：右键 EXE → 属性 → 勾选「解除锁定」后重试
- **Windows Defender 误报**：便携版未做代码签名，添加白名单即可
- **其他问题**：[提交 Issue](https://github.com/sundayzwy/auto_SQL/issues)

---

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
