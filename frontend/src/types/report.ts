export type ReportCategory = {
  category: string;
  amount: number;
  transactionCount: number;
  percentage: number;
};

export type MonthlyReportSummary = {
  income: number;
  expense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
  transactionCount: number;
  completedCount: number;
  pendingCount: number;
};

export type MonthlyReport = {
  month: string;

  summary: MonthlyReportSummary;

  categories: {
    income: ReportCategory[];
    expense: ReportCategory[];
  };
};

export type MonthlyComparisonItem = {
  month: string;
  income: number;
  expense: number;
  balance: number;
  transactionCount: number;
};

export type MonthlyComparison = {
  startMonth: string;
  endMonth: string;
  months: MonthlyComparisonItem[];
};