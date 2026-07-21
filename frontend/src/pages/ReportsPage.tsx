import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError } from "../api/api";

import {
  downloadMonthlyReportCsvRequest,
  getMonthlyComparisonRequest,
  getMonthlyReportRequest,
} from "../api/reports";

import {
  HeaderAccount,
} from "../components/HeaderAccount";

import type {
  MonthlyComparison,
  MonthlyReport,
  ReportCategory,
} from "../types/report";

import {
  formatCurrency,
  formatMonth,
  getCurrentMonth,
} from "../utils/format";

const emptyReport: MonthlyReport = {
  month: getCurrentMonth(),

  summary: {
    income: 0,
    expense: 0,
    balance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
    transactionCount: 0,
    completedCount: 0,
    pendingCount: 0,
  },

  categories: {
    income: [],
    expense: [],
  },
};

const emptyComparison: MonthlyComparison = {
  startMonth: getCurrentMonth(),
  endMonth: getCurrentMonth(),
  months: [],
};

type CategoryListProps = {
  title: string;
  description: string;
  categories: ReportCategory[];
};

function CategoryList({
  title,
  description,
  categories,
}: CategoryListProps) {
  return (
    <section className="report-category-card">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="report-empty-state">
          <p>
            Nenhuma movimentação concluída
            nesta categoria.
          </p>
        </div>
      ) : (
        <div className="report-category-list">
          {categories.map(
            (category) => (
              <article
                className="report-category-item"
                key={category.category}
              >
                <div className="report-category-header">
                  <div>
                    <strong>
                      {category.category}
                    </strong>

                    <span>
                      {category.transactionCount}{" "}
                      {category.transactionCount === 1
                        ? "movimentação"
                        : "movimentações"}
                    </span>
                  </div>

                  <div className="report-category-values">
                    <strong>
                      {formatCurrency(
                        category.amount,
                      )}
                    </strong>

                    <span>
                      {category.percentage.toFixed(2)}
                      %
                    </span>
                  </div>
                </div>

                <div className="report-progress-track">
                  <div
                    className="report-progress-value"
                    style={{
                      width:
                        `${Math.min(
                          category.percentage,
                          100,
                        )}%`,
                    }}
                  />
                </div>
              </article>
            ),
          )}
        </div>
      )}
    </section>
  );
}

export function ReportsPage() {
  const [
    month,
    setMonth,
  ] = useState(
    getCurrentMonth(),
  );

  const [
    comparisonMonths,
    setComparisonMonths,
  ] = useState(6);

  const [
    report,
    setReport,
  ] = useState<MonthlyReport>(
    emptyReport,
  );

  const [
    comparison,
    setComparison,
  ] = useState<MonthlyComparison>(
    emptyComparison,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isExporting,
    setIsExporting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadReports =
    useCallback(async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [
          monthlyResponse,
          comparisonResponse,
        ] = await Promise.all([
          getMonthlyReportRequest(
            month,
          ),

          getMonthlyComparisonRequest(
            month,
            comparisonMonths,
          ),
        ]);

        setReport(
          monthlyResponse,
        );

        setComparison(
          comparisonResponse,
        );
      } catch (error) {
        if (
          error instanceof ApiError
        ) {
          setErrorMessage(
            error.message,
          );
        } else {
          setErrorMessage(
            "Não foi possível carregar os relatórios.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    }, [
      month,
      comparisonMonths,
    ]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const largestComparisonValue =
    useMemo(() => {
      const values =
        comparison.months.flatMap(
          (item) => [
            item.income,
            item.expense,
          ],
        );

      return Math.max(
        ...values,
        1,
      );
    }, [comparison.months]);

  async function handleExport(): Promise<void> {
    setIsExporting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await downloadMonthlyReportCsvRequest(
        month,
      );

      setSuccessMessage(
        "Relatório CSV exportado com sucesso.",
      );
    } catch (error) {
      if (
        error instanceof ApiError
      ) {
        setErrorMessage(
          error.message,
        );
      } else {
        setErrorMessage(
          "Não foi possível exportar o relatório.",
        );
      }
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            Análises financeiras
          </p>

          <h1>Relatórios</h1>

          <p className="muted-text">
            Acompanhe receitas, despesas,
            categorias e evolução mensal.
          </p>
        </div>

        <HeaderAccount>
          <label className="month-field header-month-field">
            <span>Mês visualizado</span>

            <input
              type="month"
              value={month}
              onChange={(event) =>
                setMonth(
                  event.target.value,
                )
              }
            />
          </label>
        </HeaderAccount>
      </header>

      <div className="report-toolbar">
        <div>
          <strong>
            Relatório de {formatMonth(month)}
          </strong>

          <span>
            Apenas movimentações não excluídas
            são consideradas.
          </span>
        </div>

        <button
          type="button"
          className="primary-button report-export-button"
          disabled={isExporting}
          onClick={() =>
            void handleExport()
          }
        >
          {isExporting
            ? "Exportando..."
            : "Exportar CSV"}
        </button>
      </div>

      {errorMessage && (
        <div
          className="error-message"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="success-message"
          role="status"
        >
          {successMessage}
        </div>
      )}

      <section className="metrics-grid report-metrics-grid">
        <article className="metric-card">
          <span>Receitas recebidas</span>

          <strong>
            {isLoading
              ? "Carregando..."
              : formatCurrency(
                  report.summary.income,
                )}
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
              : formatCurrency(
                  report.summary.expense,
                )}
          </strong>

          <small>
            Valores concluídos no mês
          </small>
        </article>

        <article className="metric-card">
          <span>Resultado</span>

          <strong>
            {isLoading
              ? "Carregando..."
              : formatCurrency(
                  report.summary.balance,
                )}
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
                  report.summary
                    .pendingIncome -
                    report.summary
                      .pendingExpense,
                )}
          </strong>

          <small>
            A receber menos a pagar
          </small>
        </article>
      </section>

      <section className="report-status-grid">
        <article className="report-status-card">
          <span>
            Total de movimentações
          </span>

          <strong>
            {report.summary.transactionCount}
          </strong>
        </article>

        <article className="report-status-card">
          <span>Concluídas</span>

          <strong>
            {report.summary.completedCount}
          </strong>
        </article>

        <article className="report-status-card">
          <span>Pendentes</span>

          <strong>
            {report.summary.pendingCount}
          </strong>
        </article>

        <article className="report-status-card">
          <span>A receber</span>

          <strong>
            {formatCurrency(
              report.summary.pendingIncome,
            )}
          </strong>
        </article>

        <article className="report-status-card">
          <span>A pagar</span>

          <strong>
            {formatCurrency(
              report.summary.pendingExpense,
            )}
          </strong>
        </article>
      </section>

      <div className="report-categories-grid">
        <CategoryList
          title="Receitas por categoria"
          description="Distribuição das receitas concluídas."
          categories={
            report.categories.income
          }
        />

        <CategoryList
          title="Despesas por categoria"
          description="Distribuição das despesas concluídas."
          categories={
            report.categories.expense
          }
        />
      </div>

      <section className="empty-section report-comparison-section">
        <div className="section-heading report-comparison-heading">
          <div>
            <h2>
              Comparação mensal
            </h2>

            <p>
              Evolução de receitas e despesas
              até {formatMonth(month)}.
            </p>
          </div>

          <label className="comparison-months-field">
            <span>Período</span>

            <select
              value={comparisonMonths}
              onChange={(event) =>
                setComparisonMonths(
                  Number(
                    event.target.value,
                  ),
                )
              }
            >
              <option value={3}>
                Últimos 3 meses
              </option>

              <option value={6}>
                Últimos 6 meses
              </option>

              <option value={12}>
                Últimos 12 meses
              </option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <p>
            Carregando comparação...
          </p>
        ) : comparison.months.length === 0 ? (
          <div className="report-empty-state">
            <p>
              Nenhum dado encontrado para
              comparação.
            </p>
          </div>
        ) : (
          <div className="report-comparison-list">
            {comparison.months.map(
              (item) => {
                const incomeWidth =
                  (
                    item.income /
                    largestComparisonValue
                  ) * 100;

                const expenseWidth =
                  (
                    item.expense /
                    largestComparisonValue
                  ) * 100;

                return (
                  <article
                    className="report-comparison-row"
                    key={item.month}
                  >
                    <div className="report-comparison-month">
                      <strong>
                        {formatMonth(
                          item.month,
                        )}
                      </strong>

                      <span>
                        {item.transactionCount}{" "}
                        {item.transactionCount === 1
                          ? "movimentação"
                          : "movimentações"}
                      </span>
                    </div>

                    <div className="report-comparison-bars">
                      <div className="report-bar-row">
                        <span>Receitas</span>

                        <div className="report-bar-track">
                          <div
                            className="report-bar-value report-income-bar"
                            style={{
                              width:
                                `${incomeWidth}%`,
                            }}
                          />
                        </div>

                        <strong>
                          {formatCurrency(
                            item.income,
                          )}
                        </strong>
                      </div>

                      <div className="report-bar-row">
                        <span>Despesas</span>

                        <div className="report-bar-track">
                          <div
                            className="report-bar-value report-expense-bar"
                            style={{
                              width:
                                `${expenseWidth}%`,
                            }}
                          />
                        </div>

                        <strong>
                          {formatCurrency(
                            item.expense,
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="report-comparison-balance">
                      <span>Resultado</span>

                      <strong
                        className={
                          item.balance >= 0
                            ? "positive-value"
                            : "negative-value"
                        }
                      >
                        {formatCurrency(
                          item.balance,
                        )}
                      </strong>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </>
  );
}