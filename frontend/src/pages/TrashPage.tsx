import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { ApiError } from "../api/api";

import {
  listDeletedPricingCalculationsRequest,
  permanentlyDeletePricingCalculationRequest,
  restorePricingCalculationRequest,
} from "../api/pricing";

import {
  listDeletedProductsRequest,
  permanentlyDeleteProductRequest,
  restoreProductRequest,
} from "../api/products";

import {
  listDeletedTransactionsRequest,
  permanentlyDeleteTransactionRequest,
  restoreTransactionRequest,
} from "../api/transactions";

import { HeaderAccount } from "../components/HeaderAccount";

import type {
  PricingCalculation,
} from "../types/pricing";

import type {
  Product,
} from "../types/product";

import type {
  PaymentMethod,
  Transaction,
} from "../types/transaction";

import {
  formatCurrency,
  formatDate,
} from "../utils/format";

type TrashTab =
  | "transactions"
  | "products"
  | "pricing";

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
    cash:
      "Dinheiro",
    boleto:
      "Boleto",
    other:
      "Outro",
  };

  return labels[paymentMethod];
}

function formatDeletedDate(
  value: string | null,
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(date);
}

export function TrashPage() {
  const [
    activeTab,
    setActiveTab,
  ] = useState<TrashTab>(
    "transactions",
  );

  const [
    transactions,
    setTransactions,
  ] = useState<Transaction[]>(
    [],
  );

  const [
    products,
    setProducts,
  ] = useState<Product[]>(
    [],
  );

  const [
    calculations,
    setCalculations,
  ] = useState<
    PricingCalculation[]
  >([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    restoringKey,
    setRestoringKey,
  ] = useState<string | null>(
    null,
  );

  const [
    deletingKey,
    setDeletingKey,
  ] = useState<string | null>(
    null,
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadTrash =
    useCallback(
      async (): Promise<void> => {
        setIsLoading(true);
        setErrorMessage("");

        try {
          const [
            transactionResponse,
            productResponse,
            pricingResponse,
          ] = await Promise.all([
            listDeletedTransactionsRequest(
              1,
              100,
            ),

            listDeletedProductsRequest(
              1,
              100,
            ),

            listDeletedPricingCalculationsRequest(
              1,
              100,
            ),
          ]);

          setTransactions(
            transactionResponse
              .transactions,
          );

          setProducts(
            productResponse.products,
          );

          setCalculations(
            pricingResponse
              .calculations,
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
      },
      [],
    );

  useEffect(() => {
    void loadTrash();
  }, [loadTrash]);

  async function handleRestoreTransaction(
    transaction: Transaction,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Restaurar a movimentação "${transaction.description}"?`,
      );

    if (!confirmed) {
      return;
    }

    const actionId =
      `transaction-${transaction.id}`;

    setRestoringKey(actionId);
    setErrorMessage("");
    setSuccessMessage("");

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
      setRestoringKey(null);
    }
  }

  async function handlePermanentDeleteTransaction(
    transaction: Transaction,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Excluir permanentemente a movimentação "${transaction.description}"?\n\nEssa ação não poderá ser desfeita.`,
      );

    if (!confirmed) {
      return;
    }

    const actionId =
      `transaction-${transaction.id}`;

    setDeletingKey(actionId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await permanentlyDeleteTransactionRequest(
        transaction.id,
      );

      setSuccessMessage(
        "Movimentação excluída permanentemente.",
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
          "Não foi possível excluir permanentemente a movimentação.",
        );
      }
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleRestoreProduct(
    product: Product,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Restaurar o produto "${product.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    const actionId =
      `product-${product.id}`;

    setRestoringKey(actionId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await restoreProductRequest(
        product.id,
      );

      setSuccessMessage(
        "Produto restaurado com sucesso.",
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
          "Não foi possível restaurar o produto.",
        );
      }
    } finally {
      setRestoringKey(null);
    }
  }

  async function handlePermanentDeleteProduct(
    product: Product,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Excluir permanentemente o produto "${product.name}"?\n\nEssa ação não poderá ser desfeita.`,
      );

    if (!confirmed) {
      return;
    }

    const actionId =
      `product-${product.id}`;

    setDeletingKey(actionId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await permanentlyDeleteProductRequest(
        product.id,
      );

      setSuccessMessage(
        "Produto excluído permanentemente.",
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
          "Não foi possível excluir permanentemente o produto.",
        );
      }
    } finally {
      setDeletingKey(null);
    }
  }

  async function handleRestorePricing(
    calculation:
      PricingCalculation,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Restaurar a precificação "${calculation.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    const actionId =
      `pricing-${calculation.id}`;

    setRestoringKey(actionId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await restorePricingCalculationRequest(
        calculation.id,
      );

      setSuccessMessage(
        "Precificação restaurada com sucesso.",
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
          "Não foi possível restaurar a precificação.",
        );
      }
    } finally {
      setRestoringKey(null);
    }
  }

  async function handlePermanentDeletePricing(
    calculation:
      PricingCalculation,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Excluir permanentemente a precificação "${calculation.name}"?\n\nEssa ação não poderá ser desfeita.`,
      );

    if (!confirmed) {
      return;
    }

    const actionId =
      `pricing-${calculation.id}`;

    setDeletingKey(actionId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await permanentlyDeletePricingCalculationRequest(
        calculation.id,
      );

      setSuccessMessage(
        "Precificação excluída permanentemente.",
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
          "Não foi possível excluir permanentemente a precificação.",
        );
      }
    } finally {
      setDeletingKey(null);
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
            Restaure ou exclua
            permanentemente movimentações,
            produtos e precificações.
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
        <div className="trash-tabs">
          <button
            type="button"
            className={`trash-tab ${
              activeTab ===
              "transactions"
                ? "trash-tab-active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(
                "transactions",
              )
            }
          >
            Movimentações

            <span className="trash-tab-count">
              {transactions.length}
            </span>
          </button>

          <button
            type="button"
            className={`trash-tab ${
              activeTab ===
              "products"
                ? "trash-tab-active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(
                "products",
              )
            }
          >
            Produtos

            <span className="trash-tab-count">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            className={`trash-tab ${
              activeTab ===
              "pricing"
                ? "trash-tab-active"
                : ""
            }`}
            onClick={() =>
              setActiveTab(
                "pricing",
              )
            }
          >
            Precificações

            <span className="trash-tab-count">
              {calculations.length}
            </span>
          </button>
        </div>

        {isLoading ? (
          <p>
            Carregando lixeira...
          </p>
        ) : activeTab ===
          "transactions" ? (
          <>
            <div className="section-heading trash-section-heading">
              <div>
                <h2>
                  Movimentações excluídas
                </h2>

                <p>
                  {transactions.length}{" "}
                  registros encontrados.
                </p>
              </div>
            </div>

            {transactions.length ===
            0 ? (
              <div className="trash-empty-state">
                <h3>
                  Nenhuma movimentação
                  excluída
                </h3>

                <p>
                  As receitas e despesas
                  excluídas aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table trash-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Categoria</th>
                      <th>Pagamento</th>
                      <th>Valor</th>
                      <th>
                        Excluído em
                      </th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {transactions.map(
                      (transaction) => {
                        const actionId =
                          `transaction-${transaction.id}`;

                        return (
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
                                transaction
                                  .description
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
                                transaction
                                  .category
                              }
                            </td>

                            <td>
                              {paymentMethodLabel(
                                transaction
                                  .paymentMethod,
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                transaction.amount,
                              )}
                            </td>

                            <td>
                              {formatDeletedDate(
                                transaction
                                  .deletedAt,
                              )}
                            </td>

                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="table-button restore-button"
                                  disabled={
                                    restoringKey ===
                                      actionId ||
                                    deletingKey ===
                                      actionId
                                  }
                                  onClick={() =>
                                    void handleRestoreTransaction(
                                      transaction,
                                    )
                                  }
                                >
                                  {restoringKey ===
                                  actionId
                                    ? "Restaurando..."
                                    : "Restaurar"}
                                </button>

                                <button
                                  type="button"
                                  className="table-button permanent-delete-button"
                                  disabled={
                                    deletingKey ===
                                      actionId ||
                                    restoringKey ===
                                      actionId
                                  }
                                  onClick={() =>
                                    void handlePermanentDeleteTransaction(
                                      transaction,
                                    )
                                  }
                                >
                                  {deletingKey ===
                                  actionId
                                    ? "Excluindo..."
                                    : "Excluir definitivamente"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : activeTab ===
          "products" ? (
          <>
            <div className="section-heading trash-section-heading">
              <div>
                <h2>
                  Produtos excluídos
                </h2>

                <p>
                  {products.length}{" "}
                  registros encontrados.
                </p>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="trash-empty-state">
                <h3>
                  Nenhum produto excluído
                </h3>

                <p>
                  Os produtos enviados para
                  a lixeira aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table trash-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>SKU</th>
                      <th>Categoria</th>
                      <th>Status</th>
                      <th>Custo</th>
                      <th>Preço</th>
                      <th>
                        Excluído em
                      </th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {products.map(
                      (product) => {
                        const actionId =
                          `product-${product.id}`;

                        return (
                          <tr
                            key={product.id}
                          >
                            <td>
                              <strong>
                                {
                                  product.name
                                }
                              </strong>
                            </td>

                            <td>
                              {product.sku ??
                                "-"}
                            </td>

                            <td>
                              {
                                product.category
                              }
                            </td>

                            <td>
                              <span
                                className={`product-status-badge ${
                                  product.status ===
                                  "active"
                                    ? "product-active"
                                    : "product-inactive"
                                }`}
                              >
                                {product.status ===
                                "active"
                                  ? "Ativo"
                                  : "Inativo"}
                              </span>
                            </td>

                            <td>
                              {formatCurrency(
                                product.unitCost,
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                product.salePrice,
                              )}
                            </td>

                            <td>
                              {formatDeletedDate(
                                product.deletedAt,
                              )}
                            </td>

                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="table-button restore-button"
                                  disabled={
                                    restoringKey ===
                                      actionId ||
                                    deletingKey ===
                                      actionId
                                  }
                                  onClick={() =>
                                    void handleRestoreProduct(
                                      product,
                                    )
                                  }
                                >
                                  {restoringKey ===
                                  actionId
                                    ? "Restaurando..."
                                    : "Restaurar"}
                                </button>

                                <button
                                  type="button"
                                  className="table-button permanent-delete-button"
                                  disabled={
                                    deletingKey ===
                                      actionId ||
                                    restoringKey ===
                                      actionId
                                  }
                                  onClick={() =>
                                    void handlePermanentDeleteProduct(
                                      product,
                                    )
                                  }
                                >
                                  {deletingKey ===
                                  actionId
                                    ? "Excluindo..."
                                    : "Excluir definitivamente"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="section-heading trash-section-heading">
              <div>
                <h2>
                  Precificações excluídas
                </h2>

                <p>
                  {calculations.length}{" "}
                  registros encontrados.
                </p>
              </div>
            </div>

            {calculations.length ===
            0 ? (
              <div className="trash-empty-state">
                <h3>
                  Nenhuma precificação
                  excluída
                </h3>

                <p>
                  Os cálculos excluídos
                  aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table trash-table pricing-trash-table">
                  <thead>
                    <tr>
                      <th>Cálculo</th>
                      <th>Produto</th>
                      <th>Custo</th>
                      <th>
                        Preço de vitrine
                      </th>
                      <th>Preço final</th>
                      <th>Lucro</th>
                      <th>Margem</th>
                      <th>
                        Excluído em
                      </th>
                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {calculations.map(
                      (calculation) => {
                        const actionId =
                          `pricing-${calculation.id}`;

                        return (
                          <tr
                            key={
                              calculation.id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  calculation.name
                                }
                              </strong>
                            </td>

                            <td>
                              {
                                calculation
                                  .productName
                              }
                            </td>

                            <td>
                              {formatCurrency(
                                calculation
                                  .result
                                  .totalFixedCost,
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                calculation
                                  .result
                                  .suggestedListPrice,
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                calculation
                                  .result
                                  .discountedSalePrice,
                              )}
                            </td>

                            <td>
                              {formatCurrency(
                                calculation
                                  .result
                                  .expectedProfit,
                              )}
                            </td>

                            <td>
                              {
                                calculation
                                  .result
                                  .achievedMarginPercent
                              }
                              %
                            </td>

                            <td>
                              {formatDeletedDate(
                                calculation
                                  .deletedAt,
                              )}
                            </td>

                            <td>
                              <div className="table-actions">
                                <button
                                  type="button"
                                  className="table-button restore-button"
                                  disabled={
                                    restoringKey ===
                                      actionId ||
                                    deletingKey ===
                                      actionId
                                  }
                                  onClick={() =>
                                    void handleRestorePricing(
                                      calculation,
                                    )
                                  }
                                >
                                  {restoringKey ===
                                  actionId
                                    ? "Restaurando..."
                                    : "Restaurar"}
                                </button>

                                <button
                                  type="button"
                                  className="table-button permanent-delete-button"
                                  disabled={
                                    deletingKey ===
                                      actionId ||
                                    restoringKey ===
                                      actionId
                                  }
                                  onClick={() =>
                                    void handlePermanentDeletePricing(
                                      calculation,
                                    )
                                  }
                                >
                                  {deletingKey ===
                                  actionId
                                    ? "Excluindo..."
                                    : "Excluir definitivamente"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}