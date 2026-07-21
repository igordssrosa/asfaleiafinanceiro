import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { ApiError } from "../api/api";

import {
  createTransactionRequest,
  deleteTransactionRequest,
  getMonthlySummaryRequest,
  listTransactionsRequest,
  updateTransactionRequest,
} from "../api/transactions";

import type {
  MonthlySummary,
  PaymentMethod,
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../types/transaction";

import {
  formatCurrency,
  formatDate,
  getCurrentDate,
  getCurrentMonth,
} from "../utils/format";

type TransactionFormState = {
  type: TransactionType;
  description: string;
  amount: string;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes: string;
};

const initialForm: TransactionFormState = {
  type: "expense",
  description: "",
  amount: "",
  category: "",
  date: getCurrentDate(),
  paymentMethod: "pix",
  status: "completed",
  notes: "",
};

const emptySummary: MonthlySummary = {
  month: getCurrentMonth(),
  income: 0,
  expense: 0,
  balance: 0,
  pendingIncome: 0,
  pendingExpense: 0,
  transactionCount: 0,
};

const categorySuggestions = [
  "Vendas",
  "Tecidos",
  "Costura",
  "Etiquetas",
  "Embalagens",
  "Frete",
  "Marketing",
  "Site",
  "Domínio",
  "E-mail corporativo",
  "Registro de marca",
  "Equipamentos",
  "Impostos",
  "Outros",
];

function paymentMethodLabel(
  paymentMethod: PaymentMethod,
): string {
  const labels: Record<
    PaymentMethod,
    string
  > = {
    pix: "Pix",
    credit_card: "Cartão de crédito",
    debit_card: "Cartão de débito",
    bank_transfer: "Transferência bancária",
    cash: "Dinheiro",
    boleto: "Boleto",
    other: "Outro",
  };

  return labels[paymentMethod];
}

export function TransactionsPage() {
  const [month, setMonth] =
    useState(getCurrentMonth());

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [summary, setSummary] =
    useState<MonthlySummary>(
      emptySummary,
    );

  const [form, setForm] =
    useState<TransactionFormState>(
      initialForm,
    );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const loadData =
    useCallback(async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [
          transactionsResponse,
          summaryResponse,
        ] = await Promise.all([
          listTransactionsRequest({
            month,
            page: 1,
            limit: 100,
          }),

          getMonthlySummaryRequest(month),
        ]);

        setTransactions(
          transactionsResponse.transactions,
        );

        setSummary(summaryResponse);
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            "Não foi possível carregar as movimentações.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    }, [month]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function updateForm<
    Key extends keyof TransactionFormState,
  >(
    field: Key,
    value: TransactionFormState[Key],
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function resetForm(): void {
    setEditingId(null);

    setForm({
      ...initialForm,
      date: getCurrentDate(),
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedAmount =
      Number(
        form.amount
          .trim()
          .replace(",", "."),
      );

    if (
      !Number.isFinite(normalizedAmount) ||
      normalizedAmount <= 0
    ) {
      setErrorMessage(
        "Informe um valor válido e maior que zero.",
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const input = {
        type: form.type,
        description: form.description.trim(),
        amount: normalizedAmount,
        category: form.category.trim(),
        date: form.date,
        paymentMethod: form.paymentMethod,
        status: form.status,
        notes: form.notes.trim() || null,
      };

      if (editingId) {
        await updateTransactionRequest(
          editingId,
          input,
        );

        setSuccessMessage(
          "Movimentação atualizada com sucesso.",
        );
      } else {
        await createTransactionRequest(input);

        setSuccessMessage(
          "Movimentação cadastrada com sucesso.",
        );
      }

      resetForm();
      await loadData();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Não foi possível salvar a movimentação.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(
    transaction: Transaction,
  ): void {
    setEditingId(transaction.id);

    setForm({
      type: transaction.type,
      description: transaction.description,
      amount: String(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      paymentMethod:
        transaction.paymentMethod,
      status: transaction.status,
      notes: transaction.notes ?? "",
    });

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(
    transaction: Transaction,
  ): Promise<void> {
    const confirmed = window.confirm(
      `Enviar "${transaction.description}" para a lixeira?`,
    );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteTransactionRequest(
        transaction.id,
      );

      if (editingId === transaction.id) {
        resetForm();
      }

      setSuccessMessage(
        "Movimentação enviada para a lixeira.",
      );

      await loadData();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Não foi possível excluir a movimentação.",
        );
      }
    }
  }

  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            Controle financeiro
          </p>

          <h1>Movimentações</h1>

          <p className="muted-text">
            Cadastre receitas e despesas da Asfaleia.
          </p>
        </div>

        <label className="month-field">
          <span>Mês visualizado</span>

          <input
            type="month"
            value={month}
            onChange={(event) =>
              setMonth(event.target.value)
            }
          />
        </label>
      </header>

      <section className="metrics-grid compact-metrics">
        <article className="metric-card">
          <span>Receitas</span>

          <strong>
            {formatCurrency(summary.income)}
          </strong>
        </article>

        <article className="metric-card">
          <span>Despesas</span>

          <strong>
            {formatCurrency(summary.expense)}
          </strong>
        </article>

        <article className="metric-card">
          <span>Resultado</span>

          <strong>
            {formatCurrency(summary.balance)}
          </strong>
        </article>

        <article className="metric-card">
          <span>Quantidade</span>

          <strong>
            {summary.transactionCount}
          </strong>
        </article>
      </section>

      <section className="empty-section">
        <div className="section-heading">
          <div>
            <h2>
              {editingId
                ? "Editar movimentação"
                : "Nova movimentação"}
            </h2>

            <p>
              Os valores serão salvos no MongoDB Atlas.
            </p>
          </div>

          {editingId && (
            <button
              className="secondary-button inline-button"
              type="button"
              onClick={resetForm}
            >
              Cancelar edição
            </button>
          )}
        </div>

        <form
          className="transaction-form"
          onSubmit={handleSubmit}
        >
          <div className="form-grid">
            <label className="form-field">
              <span>Tipo</span>

              <select
                value={form.type}
                onChange={(event) =>
                  updateForm(
                    "type",
                    event.target
                      .value as TransactionType,
                  )
                }
                disabled={isSubmitting}
              >
                <option value="income">
                  Receita
                </option>

                <option value="expense">
                  Despesa
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>Descrição</span>

              <input
                type="text"
                value={form.description}
                onChange={(event) =>
                  updateForm(
                    "description",
                    event.target.value,
                  )
                }
                required
                minLength={2}
                maxLength={120}
                disabled={isSubmitting}
                placeholder="Ex.: Compra de tecido"
              />
            </label>

            <label className="form-field">
              <span>Valor</span>

              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) =>
                  updateForm(
                    "amount",
                    event.target.value,
                  )
                }
                required
                disabled={isSubmitting}
                placeholder="0,00"
              />
            </label>

            <label className="form-field">
              <span>Categoria</span>

              <input
                type="text"
                list="transaction-categories"
                value={form.category}
                onChange={(event) =>
                  updateForm(
                    "category",
                    event.target.value,
                  )
                }
                required
                minLength={2}
                maxLength={60}
                disabled={isSubmitting}
                placeholder="Ex.: Tecidos"
              />

              <datalist id="transaction-categories">
                {categorySuggestions.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    />
                  ),
                )}
              </datalist>
            </label>

            <label className="form-field">
              <span>Data</span>

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  updateForm(
                    "date",
                    event.target.value,
                  )
                }
                required
                disabled={isSubmitting}
              />
            </label>

            <label className="form-field">
              <span>Forma de pagamento</span>

              <select
                value={form.paymentMethod}
                onChange={(event) =>
                  updateForm(
                    "paymentMethod",
                    event.target
                      .value as PaymentMethod,
                  )
                }
                disabled={isSubmitting}
              >
                <option value="pix">
                  Pix
                </option>

                <option value="credit_card">
                  Cartão de crédito
                </option>

                <option value="debit_card">
                  Cartão de débito
                </option>

                <option value="bank_transfer">
                  Transferência bancária
                </option>

                <option value="cash">
                  Dinheiro
                </option>

                <option value="boleto">
                  Boleto
                </option>

                <option value="other">
                  Outro
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>Status</span>

              <select
                value={form.status}
                onChange={(event) =>
                  updateForm(
                    "status",
                    event.target
                      .value as TransactionStatus,
                  )
                }
                disabled={isSubmitting}
              >
                <option value="completed">
                  Concluído
                </option>

                <option value="pending">
                  Pendente
                </option>
              </select>
            </label>

            <label className="form-field full-width">
              <span>Observações</span>

              <textarea
                value={form.notes}
                onChange={(event) =>
                  updateForm(
                    "notes",
                    event.target.value,
                  )
                }
                maxLength={500}
                disabled={isSubmitting}
                placeholder="Informações adicionais"
                rows={3}
              />
            </label>
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

          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Salvando..."
              : editingId
                ? "Salvar alterações"
                : "Cadastrar movimentação"}
          </button>
        </form>
      </section>

      <section className="empty-section">
        <div className="section-heading">
          <div>
            <h2>Movimentações do mês</h2>

            <p>
              {transactions.length} registros encontrados.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p>Carregando movimentações...</p>
        ) : transactions.length === 0 ? (
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
                  <th>Pagamento</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map(
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
                          {transaction.type ===
                          "income"
                            ? "Receita"
                            : "Despesa"}
                        </span>
                      </td>

                      <td>
                        {transaction.category}
                      </td>

                      <td>
                        {paymentMethodLabel(
                          transaction.paymentMethod,
                        )}
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

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-button"
                            onClick={() =>
                              handleEdit(
                                transaction,
                              )
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="table-button danger-button"
                            onClick={() =>
                              void handleDelete(
                                transaction,
                              )
                            }
                          >
                            Excluir
                          </button>
                        </div>
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