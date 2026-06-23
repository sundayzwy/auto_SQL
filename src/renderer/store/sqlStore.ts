import { create } from 'zustand';
import { SqlDialect, Issue, TableMetadata, FormatConfig, DEFAULT_FORMAT_CONFIG } from '../shared/types';

interface SqlState {
  inputSql: string;
  formattedSql: string;
  optimizedSql: string;
  dialect: SqlDialect;
  issues: Issue[];
  tables: Map<string, TableMetadata>;
  formatConfig: FormatConfig;
  
  setInputSql: (sql: string) => void;
  setFormattedSql: (sql: string) => void;
  setOptimizedSql: (sql: string) => void;
  setDialect: (dialect: SqlDialect) => void;
  setIssues: (issues: Issue[]) => void;
  addTable: (table: TableMetadata) => void;
  removeTable: (tableName: string) => void;
  clearTables: () => void;
  setFormatConfig: (config: FormatConfig) => void;
  reset: () => void;
}

export const useSqlStore = create<SqlState>((set) => ({
  inputSql: '',
  formattedSql: '',
  optimizedSql: '',
  dialect: 'impala',
  issues: [],
  tables: new Map(),
  formatConfig: DEFAULT_FORMAT_CONFIG,
  
  setInputSql: (sql) => set({ inputSql: sql }),
  setFormattedSql: (sql) => set({ formattedSql: sql }),
  setOptimizedSql: (sql) => set({ optimizedSql: sql }),
  setDialect: (dialect) => set({ dialect }),
  setIssues: (issues) => set({ issues }),
  addTable: (table) => set((state) => {
    const newTables = new Map(state.tables);
    newTables.set(table.tableName.toLowerCase(), table);
    return { tables: newTables };
  }),
  removeTable: (tableName) => set((state) => {
    const newTables = new Map(state.tables);
    newTables.delete(tableName.toLowerCase());
    return { tables: newTables };
  }),
  clearTables: () => set({ tables: new Map() }),
  setFormatConfig: (config) => set({ formatConfig: config }),
  reset: () => set({
    inputSql: '',
    formattedSql: '',
    optimizedSql: '',
    issues: [],
  }),
}));
