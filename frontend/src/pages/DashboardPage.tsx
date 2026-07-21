import {
  useEffect,
  useState,
} from "react";

import { ApiError } from "../api/api";

import {
  getMonthlySummaryRequest,
  listTransactionsRequest,
} from "../api/transactions";

import { useAuth } from "../contexts/AuthContext";

import type {
  MonthlySummary,
  Transaction,
} from "../types/transaction";

import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
} from "../utils/format";

const emptySummary: MonthlySummary = {
  month: getCurrentMonth(),
  income: 0,
  expense: 0,
  balance: 0,
  pendingIncome: 0,
  pendingExpense: 0,
  transactionCount: 0,
};

function getTypeLabel(
  transaction: Transaction,
): string {
  return transaction.type === "income"
    ? "Receita"
    : "Despesa";
}

export function DashboardPage() {
  const { user } = useAuth();

  const [month, setMonth] =
    useState(getCurrentMonth());

  const [summary, setSummary] =
    useState<MonthlySummary>(
      emptySummary,
    );

  const [recentTransactions, setRecentTransactions] =
    useState<Transaction[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard(): Promise<void> {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [
          summaryResponse,
          transactionsResponse,
        ] = await Promise.all([
          getMonthlySummaryRequest(month),

          listTransactionsRequest({
            month,
            page: 1,
            limit: 5,
          }),
        ]);

        if (!isMounted) {
          return;
        }

        setSummary(summaryResponse);

        setRecentTransactions(
          transactionsResponse.transactions,
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            "Não foi possível carregar o dashboard.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [month]);

  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            Painel financeiro
          </p>

          <h1>
            Olá, {user?.name}
          </h1>

          <p className="muted-text">
            Resumo financeiro da Asfaleia.
          </p>
        </div>

        <label className="month-field">
          <span>Mês</span>

          <input
            type="month"
            value={month}
            onChange={(event) =>
              setMonth(event.target.value)
            }
          />
        </label>
      </header>

      {errorMessage && (
        <div
          className="error-message"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <section className="metrics-grid">
        <article className="metric-card">
          <span>Receitas recebidas</span>

          <strong>
            {isLoading
              ? "Carregando..."
              : formatCurrency(summary.income)}
          </strong>

          <small>
            Valores concluídos no mês
          </small>
        </article>

        <article className="metric-card">
          <span>Despesas pagas</span>

          <strong>
            {isLoading
              ? "Carregando..."
              : formatCurrency(summary.expense)}
          </strong>

          <small>
            Valores concluídos no mês
          </small>
        </article>

        <article className="metric-card">
          <span>Resultado do mês</span>

          <strong>
            {isLoading
              ? "Carregando..."
              : formatCurrency(summary.balance)}
          </strong>

          <small>
            Receitas menos despesas
          </small>
        </article>

        <article className="metric-card">
          <span>Pendências</span>

          <strong>
            {isLoading
              ? "Carregando..."
              : formatCurrency(
                  summary.pendingIncome -
                    summary.pendingExpense,
                )}
          </strong>

          <small>
            A receber menos a pagar
          </small>
        </article>
      </section>

      <section className="empty-section">
        <div className="section-heading">
          <div>
            <h2>Movimentações recentes</h2>

            <p>
              {summary.transactionCount} movimentações
              cadastradas no mês.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p>Carregando movimentações...</p>
        ) : recentTransactions.length === 0 ? (
          <p>
            Nenhuma movimentação cadastrada neste mês.
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Valor</th>
                </tr>
              </thead>

              <tbody>
                {recentTransactions.map(
                  (transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        {formatDate(
                          transaction.date,
                        )}
                      </td>

                      <td>
                        {transaction.description}
                      </td>

                      <td>
                        <span
                          className={`type-badge ${
                            transaction.type ===
                            "income"
                              ? "type-income"
                              : "type-expense"
                          }`}
                        >
                          {getTypeLabel(
                            transaction,
                          )}
                        </span>
                      </td>

                      <td>
                        {transaction.category}
                      </td>

                      <td>
                        {transaction.status ===
                        "completed"
                          ? "Concluído"
                          : "Pendente"}
                      </td>

                      <td>
                        {formatCurrency(
                          transaction.amount,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}