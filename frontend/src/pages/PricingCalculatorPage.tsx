import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { ApiError } from "../api/api";

import {
  calculatePricingRequest,
  deletePricingCalculationRequest,
  listPricingRequest,
  savePricingRequest,
} from "../api/pricing";

import { HeaderAccount } from "../components/HeaderAccount";

import type {
  PricingCalculation,
  PricingInput,
  PricingResult,
} from "../types/pricing";

import {
  formatCurrency,
} from "../utils/format";

type PricingFormState = {
  name: string;
  productName: string;

  productCost: string;
  packagingCost: string;
  operationalCost: string;
  shippingSubsidy: string;
  otherCost: string;

  paymentFeePercent: string;
  marketplaceFeePercent: string;
  taxPercent: string;
  targetMarginPercent: string;
  discountPercent: string;
};

const initialForm: PricingFormState = {
  name: "",
  productName: "",

  productCost: "",
  packagingCost: "0",
  operationalCost: "0",
  shippingSubsidy: "0",
  otherCost: "0",

  paymentFeePercent: "4,99",
  marketplaceFeePercent: "0",
  taxPercent: "6",
  targetMarginPercent: "30",
  discountPercent: "10",
};

function parseDecimal(
  value: string,
): number {
  return Number(
    value
      .trim()
      .replace(",", "."),
  );
}

function numberToInput(
  value: number,
): string {
  return String(value).replace(
    ".",
    ",",
  );
}

function buildPricingInput(
  form: PricingFormState,
): PricingInput | null {
  const costs = {
    productCost:
      parseDecimal(
        form.productCost,
      ),

    packagingCost:
      parseDecimal(
        form.packagingCost,
      ),

    operationalCost:
      parseDecimal(
        form.operationalCost,
      ),

    shippingSubsidy:
      parseDecimal(
        form.shippingSubsidy,
      ),

    otherCost:
      parseDecimal(
        form.otherCost,
      ),
  };

  const rates = {
    paymentFeePercent:
      parseDecimal(
        form.paymentFeePercent,
      ),

    marketplaceFeePercent:
      parseDecimal(
        form.marketplaceFeePercent,
      ),

    taxPercent:
      parseDecimal(
        form.taxPercent,
      ),

    targetMarginPercent:
      parseDecimal(
        form.targetMarginPercent,
      ),

    discountPercent:
      parseDecimal(
        form.discountPercent,
      ),
  };

  const numericValues = [
    ...Object.values(costs),
    ...Object.values(rates),
  ];

  const hasInvalidNumber =
    numericValues.some(
      (value) =>
        !Number.isFinite(value) ||
        value < 0,
    );

  if (hasInvalidNumber) {
    return null;
  }

  const totalCosts =
    costs.productCost +
    costs.packagingCost +
    costs.operationalCost +
    costs.shippingSubsidy +
    costs.otherCost;

  if (totalCosts <= 0) {
    return null;
  }

  const totalPercentage =
    rates.paymentFeePercent +
    rates.marketplaceFeePercent +
    rates.taxPercent +
    rates.targetMarginPercent;

  if (
    totalPercentage >= 100 ||
    rates.discountPercent >= 100
  ) {
    return null;
  }

  if (
    form.name.trim().length < 2 ||
    form.productName.trim().length < 2
  ) {
    return null;
  }

  return {
    name:
      form.name.trim(),

    productName:
      form.productName.trim(),

    costs,
    rates,
  };
}

function formatDateTime(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    },
  ).format(
    new Date(value),
  );
}

export function PricingCalculatorPage() {
  const [
    form,
    setForm,
  ] = useState<PricingFormState>(
    initialForm,
  );

  const [
    result,
    setResult,
  ] = useState<PricingResult | null>(
    null,
  );

  const [
    calculations,
    setCalculations,
  ] = useState<PricingCalculation[]>(
    [],
  );

  const [
    isCalculating,
    setIsCalculating,
  ] = useState(false);

  const [
    isSaving,
    setIsSaving,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState<string | null>(
    null,
  );

  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadHistory =
    useCallback(
      async (): Promise<void> => {
        setIsLoadingHistory(true);

        try {
          const response =
            await listPricingRequest(
              1,
              50,
            );

          setCalculations(
            response.calculations,
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
              "Não foi possível carregar o histórico.",
            );
          }
        } finally {
          setIsLoadingHistory(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const input =
      buildPricingInput(form);

    if (!input) {
      setResult(null);
      setIsCalculating(false);

      return;
    }

    let isCancelled = false;

    const timer =
      window.setTimeout(
        async () => {
          setIsCalculating(true);

          try {
            const response =
              await calculatePricingRequest(
                input,
              );

            if (!isCancelled) {
              setResult(
                response.result,
              );

              setErrorMessage("");
            }
          } catch (error) {
            if (isCancelled) {
              return;
            }

            setResult(null);

            if (
              error instanceof ApiError
            ) {
              setErrorMessage(
                error.message,
              );
            } else {
              setErrorMessage(
                "Não foi possível calcular o preço.",
              );
            }
          } finally {
            if (!isCancelled) {
              setIsCalculating(false);
            }
          }
        },
        400,
      );

    return () => {
      isCancelled = true;

      window.clearTimeout(
        timer,
      );
    };
  }, [form]);

  function updateForm<
    Key extends keyof PricingFormState,
  >(
    field: Key,
    value: PricingFormState[Key],
  ): void {
    setForm(
      (currentForm) => ({
        ...currentForm,
        [field]: value,
      }),
    );

    setSuccessMessage("");
  }

  function resetForm(): void {
    setForm(initialForm);
    setResult(null);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSave(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const input =
      buildPricingInput(form);

    if (!input) {
      setErrorMessage(
        "Preencha os campos corretamente. A soma das taxas com a margem deve ser menor que 100%.",
      );

      return;
    }

    setIsSaving(true);

    try {
      const response =
        await savePricingRequest(
          input,
        );

      setResult(
        response.calculation.result,
      );

      setSuccessMessage(
        "Precificação salva com sucesso.",
      );

      await loadHistory();
    } catch (error) {
      if (
        error instanceof ApiError
      ) {
        setErrorMessage(
          error.message,
        );
      } else {
        setErrorMessage(
          "Não foi possível salvar a precificação.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleLoadCalculation(
    calculation:
      PricingCalculation,
  ): void {
    setForm({
      name:
        calculation.name,

      productName:
        calculation.productName,

      productCost:
        numberToInput(
          calculation
            .costs
            .productCost,
        ),

      packagingCost:
        numberToInput(
          calculation
            .costs
            .packagingCost,
        ),

      operationalCost:
        numberToInput(
          calculation
            .costs
            .operationalCost,
        ),

      shippingSubsidy:
        numberToInput(
          calculation
            .costs
            .shippingSubsidy,
        ),

      otherCost:
        numberToInput(
          calculation
            .costs
            .otherCost,
        ),

      paymentFeePercent:
        numberToInput(
          calculation
            .rates
            .paymentFeePercent,
        ),

      marketplaceFeePercent:
        numberToInput(
          calculation
            .rates
            .marketplaceFeePercent,
        ),

      taxPercent:
        numberToInput(
          calculation
            .rates
            .taxPercent,
        ),

      targetMarginPercent:
        numberToInput(
          calculation
            .rates
            .targetMarginPercent,
        ),

      discountPercent:
        numberToInput(
          calculation
            .rates
            .discountPercent,
        ),
    });

    setResult(
      calculation.result,
    );

    setErrorMessage("");

    setSuccessMessage(
      "Cálculo carregado no formulário.",
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDeleteCalculation(
    calculation:
      PricingCalculation,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Enviar a precificação "${calculation.name}" para a lixeira?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      calculation.id,
    );

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deletePricingCalculationRequest(
        calculation.id,
      );

      setSuccessMessage(
        "Precificação enviada para a lixeira.",
      );

      await loadHistory();
    } catch (error) {
      if (
        error instanceof ApiError
      ) {
        setErrorMessage(
          error.message,
        );
      } else {
        setErrorMessage(
          "Não foi possível excluir a precificação.",
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            Formação de preço
          </p>

          <h1>
            Calculadora de preço
          </h1>

          <p className="muted-text">
            Calcule o preço de venda com
            custos, taxas, margem e
            desconto.
          </p>
        </div>

        <HeaderAccount />
      </header>

      <div className="pricing-layout">
        <section className="empty-section">
          <div className="section-heading">
            <div>
              <h2>
                Dados da precificação
              </h2>

              <p>
                Os valores devem
                representar o custo de uma
                unidade.
              </p>
            </div>

            <button
              type="button"
              className="secondary-button inline-button"
              onClick={resetForm}
            >
              Limpar
            </button>
          </div>

          <form
            className="pricing-form"
            onSubmit={handleSave}
          >
            <div className="pricing-group">
              <h3>Identificação</h3>

              <div className="form-grid pricing-form-grid">
                <label className="form-field">
                  <span>
                    Nome do cálculo
                  </span>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value,
                      )
                    }
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Ex.: Camiseta básica — venda normal"
                  />
                </label>

                <label className="form-field">
                  <span>Produto</span>

                  <input
                    type="text"
                    value={
                      form.productName
                    }
                    onChange={(event) =>
                      updateForm(
                        "productName",
                        event.target.value,
                      )
                    }
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Ex.: Camiseta básica"
                  />
                </label>
              </div>
            </div>

            <div className="pricing-group">
              <h3>
                Custos por unidade
              </h3>

              <div className="form-grid pricing-form-grid">
                <label className="form-field">
                  <span>
                    Custo do produto
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.productCost
                    }
                    onChange={(event) =>
                      updateForm(
                        "productCost",
                        event.target.value,
                      )
                    }
                    required
                    placeholder="0,00"
                  />
                </label>

                <label className="form-field">
                  <span>Embalagem</span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.packagingCost
                    }
                    onChange={(event) =>
                      updateForm(
                        "packagingCost",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>
                    Custo operacional
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.operationalCost
                    }
                    onChange={(event) =>
                      updateForm(
                        "operationalCost",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>
                    Frete subsidiado
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.shippingSubsidy
                    }
                    onChange={(event) =>
                      updateForm(
                        "shippingSubsidy",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>
                    Outros custos
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.otherCost
                    }
                    onChange={(event) =>
                      updateForm(
                        "otherCost",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>
              </div>
            </div>

            <div className="pricing-group">
              <h3>
                Taxas e margem
              </h3>

              <div className="form-grid pricing-form-grid">
                <label className="form-field">
                  <span>
                    Taxa de pagamento (%)
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.paymentFeePercent
                    }
                    onChange={(event) =>
                      updateForm(
                        "paymentFeePercent",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>
                    Taxa de marketplace (%)
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.marketplaceFeePercent
                    }
                    onChange={(event) =>
                      updateForm(
                        "marketplaceFeePercent",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>
                    Impostos (%)
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.taxPercent
                    }
                    onChange={(event) =>
                      updateForm(
                        "taxPercent",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>
                    Margem desejada (%)
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.targetMarginPercent
                    }
                    onChange={(event) =>
                      updateForm(
                        "targetMarginPercent",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>

                <label className="form-field">
                  <span>
                    Desconto planejado (%)
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={
                      form.discountPercent
                    }
                    onChange={(event) =>
                      updateForm(
                        "discountPercent",
                        event.target.value,
                      )
                    }
                    required
                  />
                </label>
              </div>
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

            <div className="pricing-form-actions">
              <button
                className="primary-button"
                type="submit"
                disabled={
                  isSaving ||
                  isCalculating ||
                  !result
                }
              >
                {isSaving
                  ? "Salvando..."
                  : "Salvar precificação"}
              </button>

              {isCalculating && (
                <span className="pricing-calculating">
                  Calculando...
                </span>
              )}
            </div>
          </form>
        </section>

        <aside className="pricing-result-panel">
          <div>
            <p className="eyebrow">
              Resultado
            </p>

            <h2>
              Preço sugerido
            </h2>
          </div>

          {!result ? (
            <div className="pricing-result-empty">
              <p>
                Preencha os dados para gerar
                a precificação.
              </p>
            </div>
          ) : (
            <>
              <div className="pricing-main-result">
                <span>
                  Preço de vitrine
                </span>

                <strong>
                  {formatCurrency(
                    result
                      .suggestedListPrice,
                  )}
                </strong>

                <small>
                  Preço antes do desconto
                  planejado.
                </small>
              </div>

              <div className="pricing-result-list">
                <div>
                  <span>
                    Preço após desconto
                  </span>

                  <strong>
                    {formatCurrency(
                      result
                        .discountedSalePrice,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Preço mínimo
                  </span>

                  <strong>
                    {formatCurrency(
                      result
                        .targetSalePrice,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Custos fixos
                  </span>

                  <strong>
                    {formatCurrency(
                      result
                        .totalFixedCost,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Custos das taxas
                  </span>

                  <strong>
                    {formatCurrency(
                      result
                        .expectedVariableCosts,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Lucro esperado
                  </span>

                  <strong>
                    {formatCurrency(
                      result
                        .expectedProfit,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Margem real
                  </span>

                  <strong>
                    {
                      result
                        .achievedMarginPercent
                    }
                    %
                  </strong>
                </div>

                <div>
                  <span>
                    Taxas totais
                  </span>

                  <strong>
                    {
                      result
                        .totalVariableRatePercent
                    }
                    %
                  </strong>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      <section className="empty-section pricing-history-section">
        <div className="section-heading">
          <div>
            <h2>
              Histórico de precificações
            </h2>

            <p>
              {calculations.length} cálculos
              encontrados.
            </p>
          </div>
        </div>

        {isLoadingHistory ? (
          <p>
            Carregando histórico...
          </p>
        ) : calculations.length === 0 ? (
          <div className="trash-empty-state">
            <h3>
              Nenhuma precificação salva
            </h3>

            <p>
              Os cálculos salvos aparecerão
              nesta lista.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table pricing-history-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cálculo</th>
                  <th>Produto</th>
                  <th>Custo</th>
                  <th>
                    Preço de vitrine
                  </th>
                  <th>Preço final</th>
                  <th>Lucro</th>
                  <th>Margem</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {calculations.map(
                  (calculation) => (
                    <tr
                      key={
                        calculation.id
                      }
                    >
                      <td>
                        {formatDateTime(
                          calculation.createdAt,
                        )}
                      </td>

                      <td>
                        {
                          calculation.name
                        }
                      </td>

                      <td>
                        {
                          calculation.productName
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
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-button"
                            disabled={
                              deletingId ===
                              calculation.id
                            }
                            onClick={() =>
                              handleLoadCalculation(
                                calculation,
                              )
                            }
                          >
                            Carregar
                          </button>

                          <button
                            type="button"
                            className="table-button danger-button"
                            disabled={
                              deletingId ===
                              calculation.id
                            }
                            onClick={() =>
                              void handleDeleteCalculation(
                                calculation,
                              )
                            }
                          >
                            {deletingId ===
                            calculation.id
                              ? "Excluindo..."
                              : "Excluir"}
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