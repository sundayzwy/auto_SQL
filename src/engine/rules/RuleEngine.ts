import { Rule } from './Rule';
import { ASTNode, Issue, SqlDialect, TableMetadata } from '../../shared/types';

// 通用规则
import { R001_AvoidSelectStar } from './common/R001_AvoidSelectStar';
import { R002_AvoidCartesianProduct } from './common/R002_AvoidCartesianProduct';
import { R003_SubqueryToJoin } from './common/R003_SubqueryToJoin';
import { R004_AvoidFunctionOnColumn } from './common/R004_AvoidFunctionOnColumn';
import { R005_LikeLeadingWildcard } from './common/R005_LikeLeadingWildcard';
import { R006_UnionToUnionAll } from './common/R006_UnionToUnionAll';
import { R007_AvoidImplicitConversion } from './common/R007_AvoidImplicitConversion';
import { R008_ExistsInsteadofIn } from './common/R008_ExistsInsteadofIn';

// Impala 规则
import { I001_PartitionFilter } from './impala/I001_PartitionFilter';
import { I002_JoinOrder } from './impala/I002_JoinOrder';
import { I003_DataSkew } from './impala/I003_DataSkew';
import { I004_JoinType } from './impala/I004_JoinType';
import { I005_CountDistinct } from './impala/I005_CountDistinct';
import { I006_ComputeStats } from './impala/I006_ComputeStats';

// Oracle 规则
import { O001_IndexUsage } from './oracle/O001_IndexUsage';
import { O002_FunctionOnIndexedColumn } from './oracle/O002_FunctionOnIndexedColumn';
import { O003_PaginationOptimization } from './oracle/O003_PaginationOptimization';
import { O004_AvoidOrFullScan } from './oracle/O004_AvoidOrFullScan';
import { O005_HintUsage } from './oracle/O005_HintUsage';

/**
 * 规则引擎
 *
 * 负责加载、管理和执行所有 SQL 优化规则。规则引擎在初始化时自动注册
 * 所有通用规则（common）、Impala 规则和 Oracle 规则，并根据配置的
 * 方言和启用状态筛选适用的规则执行分析。通过 setEnabledRules 可以
 * 动态控制启用哪些规则，通过 getAvailableRules 可以获取所有已注册的规则。
 */
export class RuleEngine {
  private rules: Rule[] = [];
  private enabledRules: Set<string> = new Set();

  constructor() {
    this.loadRules();
  }

  /**
   * 加载所有已注册的 SQL 优化规则
   *
   * 在构造函数中调用，将通用规则、Impala 规则和 Oracle 规则
   * 全部注册到规则列表中，并默认启用所有规则。
   */
  private loadRules(): void {
    // 通用规则
    this.rules.push(new R001_AvoidSelectStar());
    this.rules.push(new R002_AvoidCartesianProduct());
    this.rules.push(new R003_SubqueryToJoin());
    this.rules.push(new R004_AvoidFunctionOnColumn());
    this.rules.push(new R005_LikeLeadingWildcard());
    this.rules.push(new R006_UnionToUnionAll());
    this.rules.push(new R007_AvoidImplicitConversion());
    this.rules.push(new R008_ExistsInsteadofIn());

    // Impala 规则
    this.rules.push(new I001_PartitionFilter());
    this.rules.push(new I002_JoinOrder());
    this.rules.push(new I003_DataSkew());
    this.rules.push(new I004_JoinType());
    this.rules.push(new I005_CountDistinct());
    this.rules.push(new I006_ComputeStats());

    // Oracle 规则
    this.rules.push(new O001_IndexUsage());
    this.rules.push(new O002_FunctionOnIndexedColumn());
    this.rules.push(new O003_PaginationOptimization());
    this.rules.push(new O004_AvoidOrFullScan());
    this.rules.push(new O005_HintUsage());

    // 默认启用所有规则
    this.rules.forEach(rule => this.enabledRules.add(rule.id));
  }

  /**
   * 设置启用的规则列表
   *
   * 通过传入规则 ID 数组来指定哪些规则需要执行。
   * 未在列表中的规则将被跳过。
   *
   * @param ruleIds - 需要启用的规则 ID 数组
   */
  setEnabledRules(ruleIds: string[]): void {
    this.enabledRules = new Set(ruleIds);
  }

  /**
   * 获取所有可用规则
   *
   * @returns 所有已注册的规则实例列表，包含通用规则、Impala 规则和 Oracle 规则
   */
  getAvailableRules(): Rule[] {
    return this.rules;
  }

  /**
   * 对 AST 执行规则分析
   *
   * 遍历所有已注册的规则，筛选出已启用且适用于当前方言的规则，
   * 依次执行分析并汇总所有检测到的问题。单条规则分析异常不会中断整个流程。
   *
   * @param ast - 待分析的抽象语法树根节点
   * @param dialect - 目标 SQL 方言（impala 或 oracle）
   * @param metadata - 可选的表元数据映射
   * @returns 所有规则检测到的问题列表
   */
  analyze(ast: ASTNode, dialect: SqlDialect, metadata?: Map<string, TableMetadata>): Issue[] {
    const issues: Issue[] = [];

    for (const rule of this.rules) {
      if (!this.enabledRules.has(rule.id)) {
        continue;
      }

      if (!rule.dialects.includes(dialect)) {
        continue;
      }

      try {
        const ruleIssues = rule.analyze(ast, metadata);
        issues.push(...ruleIssues);
      } catch (error) {
        console.error(`Rule ${rule.id} failed:`, error);
      }
    }

    return issues;
  }
}
