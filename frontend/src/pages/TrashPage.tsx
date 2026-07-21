import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { ApiError } from "../api/api";

import {
  listDeletedTransactionsRequest,
  restoreTransactionRequest,
} from "../api/transactions";

import type {
  PaymentMethod,
  Transaction,
} from "../types/transaction";

import {
  formatCurrency,
  formatDate,
} from "../utils/format";

import { HeaderAccount } from "../components/HeaderAccount";

function paymentMethodLabel(
  paymentMethod: PaymentMethod,
): string {
  const labels: Record<
    PaymentMethod,
    string
  > = {
    pix: "Pix",
    credit_card:
      "Cartão de crédito",
    debit_card:
      "Cartão de débito",
    bank_transfer:
      "Transferência bancária",
    cash: "Dinheiro",
    boleto: "Boleto",
    other: "Outro",
  };

  return labels[paymentMethod];
}

function formatDeletedDate(
  value: string | null,
): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export function TrashPage() {
  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[]>([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    restoringId,
    setRestoringId,
  ] = useState<string | null>(null);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadTrash =
    useCallback(async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response =
          await listDeletedTransactionsRequest(
            1,
            100,
          );

        setTransactions(
          response.transactions,
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
            "Não foi possível carregar a lixeira.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  async function handleRestore(
    transaction: Transaction,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Restaurar "${transaction.description}"?`,
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setRestoringId(
      transaction.id,
    );

    try {
      await restoreTransactionRequest(
        transaction.id,
      );

      setSuccessMessage(
        "Movimentação restaurada com sucesso.",
      );

      await loadTrash();
    } catch (error) {
      if (
        error instanceof ApiError
      ) {
        setErrorMessage(
          error.message,
        );
      } else {
        setErrorMessage(
          "Não foi possível restaurar a movimentação.",
        );
      }
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <>
<header className="dashboard-header">
  <div>
    <p className="eyebrow">
      Exclusões
    </p>

    <h1>Lixeira</h1>

    <p className="muted-text">
      Movimentações excluídas podem ser restauradas.
    </p>
  </div>

  <HeaderAccount />
</header>

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

      <section className="empty-section">
        <div className="section-heading">
          <div>
            <h2>
              Movimentações excluídas
            </h2>

            <p>
              {transactions.length} registros
              encontrados.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p>
            Carregando lixeira...
          </p>
        ) : transactions.length === 0 ? (
          <div className="trash-empty-state">
            <h3>
              A lixeira está vazia
            </h3>

            <p>
              As movimentações excluídas
              aparecerão aqui.
            </p>
          </div>
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
                  <th>Valor</th>
                  <th>Excluído em</th>
                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map(
                  (transaction) => (
                    <tr
                      key={
                        transaction.id
                      }
                    >
                      <td>
                        {formatDate(
                          transaction.date,
                        )}
                      </td>

                      <td>
                        {
                          transaction.description
                        }
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
                        {
                          transaction.category
                        }
                      </td>

                      <td>
                        {paymentMethodLabel(
                          transaction.paymentMethod,
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          transaction.amount,
                        )}
                      </td>

                      <td>
                        {formatDeletedDate(
                          transaction.deletedAt,
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="table-button restore-button"
                          disabled={
                            restoringId ===
                            transaction.id
                          }
                          onClick={() =>
                            void handleRestore(
                              transaction,
                            )
                          }
                        >
                          {restoringId ===
                          transaction.id
                            ? "Restaurando..."
                            : "Restaurar"}
                        </button>
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