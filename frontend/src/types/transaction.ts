export type TransactionType =
  | "income"
  | "expense";

export type TransactionStatus =
  | "completed"
  | "pending";

export type PaymentMethod =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "bank_transfer"
  | "cash"
  | "boleto"
  | "other";

export type Transaction = {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes: string | null;
  createdBy: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TransactionInput = {
  type: TransactionType;
  description: string;
  amount: number;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes?: string | null;
};

export type TransactionResponse = {
  message: string;
  transaction: Transaction;
};

export type ListTransactionsResponse = {
  transactions: Transaction[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type MonthlySummary = {
  month: string;
  income: number;
  expense: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
  transactionCount: number;
};

export type TransactionMessageResponse = {
  message: string;
};

export type ListTransactionsParams = {
  month?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  category?: string;
  page?: number;
  limit?: number;
};