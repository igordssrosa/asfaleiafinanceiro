import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  ApiError,
} from "../api/api";

import {
  listInventoryRequest,
  updateInventoryItemRequest,
} from "../api/inventory";

import {
  deleteProductRequest,
} from "../api/products";

import {
  HeaderAccount,
} from "../components/HeaderAccount";

import type {
  InventoryItem,
  InventoryPagination,
  InventoryStatus,
  InventorySummary,
  InventoryVariantInput,
} from "../types/inventory";

type InventoryFilterState = {
  search: string;
  status: "" | InventoryStatus;
};

type EditableVariant = {
  clientId: string;
  id: string | null;
  color: string;
  size: string;
  quantity: string;
  minimumStock: string;
};

type LoadInventoryOptions = {
  silent?: boolean;
};

const initialFilters: InventoryFilterState = {
  search: "",
  status: "",
};

const initialSummary: InventorySummary = {
  totalProducts: 0,
  activeProducts: 0,
  inactiveProducts: 0,
  totalUnits: 0,
  lowStockVariants: 0,
  outOfStockVariants: 0,
};

const initialPagination: InventoryPagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

const allowedColors = [
  "Branca",
  "Preta",
  "Cinza",
  "Bege",
] as const;

const allowedSizes = [
  "P",
  "M",
  "G",
  "GG",
  "G1",
] as const;

function normalizeAllowedColor(
  value: string,
): string {
  const normalizedValue =
    value
      .trim()
      .toLocaleLowerCase(
        "pt-BR",
      );

  const aliases:
    Record<string, string> = {
      branca: "Branca",
      branco: "Branca",
      preta: "Preta",
      preto: "Preta",
      cinza: "Cinza",
      bege: "Bege",
    };

  return (
    aliases[
      normalizedValue
    ] ??
    ""
  );
}

function normalizeAllowedSize(
  value: string,
): string {
  const normalizedValue =
    value
      .trim()
      .toLocaleUpperCase(
        "pt-BR",
      );

  return allowedSizes.includes(
    normalizedValue as
      (typeof allowedSizes)[number],
  )
    ? normalizedValue
    : "";
}

function createClientId(): string {
  return [
    "variant",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function createEmptyVariant(): EditableVariant {
  return {
    clientId: createClientId(),
    id: null,
    color: "",
    size: "",
    quantity: "0",
    minimumStock: "0",
  };
}

function mapInventoryVariants(
  inventoryItem: InventoryItem,
): EditableVariant[] {
  return inventoryItem.variants.map(
    (variant) => ({
      clientId:
        variant.id ??
        createClientId(),

      id:
        variant.id,

      color:
        normalizeAllowedColor(
          variant.color,
        ),

      size:
        normalizeAllowedSize(
          variant.size,
        ),

      quantity:
        String(
          variant.quantity,
        ),

      minimumStock:
        String(
          variant.minimumStock,
        ),
    }),
  );
}

function formatMoney(
  value: number,
): string {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    },
  ).format(value);
}

function formatDateTime(
  value: string,
): string {
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

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof ApiError
  ) {
    return error.message;
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}

function parseNonNegativeInteger(
  value: string,
): number | null {
  if (
    value.trim() === ""
  ) {
    return null;
  }

  const parsedValue =
    Number(value);

  if (
    !Number.isInteger(
      parsedValue,
    ) ||
    parsedValue < 0
  ) {
    return null;
  }

  return parsedValue;
}

function getStockSituation(
  inventoryItem: InventoryItem,
): string {
  if (
    inventoryItem.variantCount === 0
  ) {
    return "Não configurado";
  }

  if (
    inventoryItem.totalQuantity === 0
  ) {
    return "Sem estoque";
  }

  if (
    inventoryItem.lowStockVariants > 0 ||
    inventoryItem.outOfStockVariants > 0
  ) {
    return "Requer atenção";
  }

  return "Normal";
}

function getStockSituationClass(
  inventoryItem: InventoryItem,
): string {
  if (
    inventoryItem.variantCount === 0
  ) {
    return "inventory-situation-unconfigured";
  }

  if (
    inventoryItem.totalQuantity === 0
  ) {
    return "inventory-situation-out";
  }

  if (
    inventoryItem.lowStockVariants > 0 ||
    inventoryItem.outOfStockVariants > 0
  ) {
    return "inventory-situation-warning";
  }

  return "inventory-situation-normal";
}

function getUniqueValues(
  values: string[],
  mode: "color" | "size",
): string[] {
  const uniqueValues =
    new Map<string, string>();

  for (
    const originalValue
    of values
  ) {
    const trimmedValue =
      originalValue.trim();

    if (!trimmedValue) {
      continue;
    }

    const normalizedValue =
      mode === "size"
        ? trimmedValue.toLocaleUpperCase(
            "pt-BR",
          )
        : trimmedValue.toLocaleLowerCase(
            "pt-BR",
          );

    if (
      !uniqueValues.has(
        normalizedValue,
      )
    ) {
      uniqueValues.set(
        normalizedValue,
        mode === "size"
          ? trimmedValue.toLocaleUpperCase(
              "pt-BR",
            )
          : trimmedValue,
      );
    }
  }

  return Array.from(
    uniqueValues.values(),
  ).sort((firstValue, secondValue) =>
    firstValue.localeCompare(
      secondValue,
      "pt-BR",
      {
        numeric: true,
      },
    ),
  );
}

export function InventoryPage() {
  const [
    filterForm,
    setFilterForm,
  ] =
    useState<InventoryFilterState>({
      ...initialFilters,
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<InventoryFilterState>({
      ...initialFilters,
    });

  const [
    inventoryItems,
    setInventoryItems,
  ] =
    useState<InventoryItem[]>([]);

  const [
    summary,
    setSummary,
  ] =
    useState<InventorySummary>(
      initialSummary,
    );

  const [
    pagination,
    setPagination,
  ] =
    useState<InventoryPagination>(
      initialPagination,
    );

  const [
    page,
    setPage,
  ] =
    useState(1);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  const [
    selectedInventoryItem,
    setSelectedInventoryItem,
  ] =
    useState<InventoryItem | null>(
      null,
    );

  const [
    editableVariants,
    setEditableVariants,
  ] =
    useState<EditableVariant[]>([]);

  const [
    editorIsActive,
    setEditorIsActive,
  ] =
    useState(true);

  const [
    editorError,
    setEditorError,
  ] =
    useState("");

  const [
    editorSuccess,
    setEditorSuccess,
  ] =
    useState("");

  const [
    isSaving,
    setIsSaving,
  ] =
    useState(false);

  const [
    isDeleting,
    setIsDeleting,
  ] =
    useState(false);

  const availableColors =
    useMemo(
      () =>
        getUniqueValues(
          editableVariants.map(
            (variant) =>
              variant.color,
          ),
          "color",
        ),
      [
        editableVariants,
      ],
    );

  const availableSizes =
    useMemo(
      () =>
        getUniqueValues(
          editableVariants.map(
            (variant) =>
              variant.size,
          ),
          "size",
        ),
      [
        editableVariants,
      ],
    );

  const loadInventory =
    useCallback(
      async (
        options:
          LoadInventoryOptions = {},
      ): Promise<void> => {
        const silent =
          options.silent ??
          false;

        if (silent) {
          setIsRefreshing(
            true,
          );
        } else {
          setIsLoading(
            true,
          );
        }

        try {
          const response =
            await listInventoryRequest({
              search:
                appliedFilters.search ||
                undefined,

              status:
                appliedFilters.status ||
                undefined,

              page,

              limit: 20,
            });

          setInventoryItems(
            response.inventoryItems,
          );

          setSummary(
            response.summary,
          );

          setPagination(
            response.pagination,
          );

          setErrorMessage("");
        } catch (error) {
          setErrorMessage(
            getErrorMessage(
              error,
            ),
          );
        } finally {
          if (silent) {
            setIsRefreshing(
              false,
            );
          } else {
            setIsLoading(
              false,
            );
          }
        }
      },
      [
        appliedFilters,
        page,
      ],
    );

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    if (
      !selectedInventoryItem
    ) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      if (
        event.key ===
          "Escape" &&
        !isSaving &&
        !isDeleting
      ) {
        setSelectedInventoryItem(
          null,
        );

        setEditableVariants(
          [],
        );

        setEditorError("");
        setEditorSuccess("");
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    selectedInventoryItem,
    isSaving,
    isDeleting,
  ]);

  function handleApplyFilters(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setPage(1);

    setAppliedFilters({
      search:
        filterForm.search.trim(),

      status:
        filterForm.status,
    });

    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleClearFilters(): void {
    setFilterForm({
      ...initialFilters,
    });

    setAppliedFilters({
      ...initialFilters,
    });

    setPage(1);
    setErrorMessage("");
    setSuccessMessage("");
  }

  function handleOpenManager(
    inventoryItem:
      InventoryItem,
  ): void {
    setSelectedInventoryItem(
      inventoryItem,
    );

    setEditorIsActive(
      inventoryItem.isActive,
    );

    setEditableVariants(
      mapInventoryVariants(
        inventoryItem,
      ),
    );

    setEditorError("");
    setEditorSuccess("");
    setSuccessMessage("");
  }

  function handleCloseManager(): void {
    if (
      isSaving ||
      isDeleting
    ) {
      return;
    }

    setSelectedInventoryItem(
      null,
    );

    setEditableVariants(
      [],
    );

    setEditorError("");
    setEditorSuccess("");
  }

  function handleBackdropClick(
    event:
      MouseEvent<HTMLDivElement>,
  ): void {
    if (
      event.target ===
      event.currentTarget
    ) {
      handleCloseManager();
    }
  }

  function handleAddVariant(): void {
    setEditableVariants(
      (currentVariants) => [
        ...currentVariants,
        createEmptyVariant(),
      ],
    );

    setEditorError("");
    setEditorSuccess("");
  }

  function handleRemoveVariant(
    clientId: string,
  ): void {
    setEditableVariants(
      (currentVariants) =>
        currentVariants.filter(
          (variant) =>
            variant.clientId !==
            clientId,
        ),
    );

    setEditorError("");
    setEditorSuccess("");
  }

  function handleRemoveColor(
    color: string,
  ): void {
    const confirmed =
      window.confirm(
        `Remover todas as variações da cor "${color}"?`,
      );

    if (!confirmed) {
      return;
    }

    const normalizedColor =
      color
        .trim()
        .toLocaleLowerCase(
          "pt-BR",
        );

    setEditableVariants(
      (currentVariants) =>
        currentVariants.filter(
          (variant) =>
            variant.color
              .trim()
              .toLocaleLowerCase(
                "pt-BR",
              ) !==
            normalizedColor,
        ),
    );

    setEditorError("");
    setEditorSuccess("");
  }

  function handleRemoveSize(
    size: string,
  ): void {
    const confirmed =
      window.confirm(
        `Remover todas as variações do tamanho "${size}"?`,
      );

    if (!confirmed) {
      return;
    }

    const normalizedSize =
      size
        .trim()
        .toLocaleUpperCase(
          "pt-BR",
        );

    setEditableVariants(
      (currentVariants) =>
        currentVariants.filter(
          (variant) =>
            variant.size
              .trim()
              .toLocaleUpperCase(
                "pt-BR",
              ) !==
            normalizedSize,
        ),
    );

    setEditorError("");
    setEditorSuccess("");
  }

  function updateVariantField(
    clientId: string,
    field:
      | "color"
      | "size"
      | "quantity"
      | "minimumStock",
    value: string,
  ): void {
    setEditableVariants(
      (currentVariants) =>
        currentVariants.map(
          (variant) =>
            variant.clientId ===
            clientId
              ? {
                  ...variant,
                  [field]: value,
                }
              : variant,
        ),
    );

    setEditorError("");
    setEditorSuccess("");
  }

  function validateVariants():
    InventoryVariantInput[] | null {
    const normalizedVariants:
      InventoryVariantInput[] = [];

    const combinations =
      new Set<string>();

    for (
      let index = 0;
      index <
      editableVariants.length;
      index += 1
    ) {
      const variant =
        editableVariants[index];

      const color =
        normalizeAllowedColor(
          variant.color,
        );

      const size =
        normalizeAllowedSize(
          variant.size,
        );

      if (!color) {
        setEditorError(
          `Selecione uma cor válida na variação ${index + 1}.`,
        );

        return null;
      }

      if (!size) {
        setEditorError(
          `Selecione um tamanho válido na variação ${index + 1}.`,
        );

        return null;
      }

      const quantity =
        parseNonNegativeInteger(
          variant.quantity,
        );

      if (
        quantity === null
      ) {
        setEditorError(
          `A quantidade da variação ${index + 1} deve ser um número inteiro maior ou igual a zero.`,
        );

        return null;
      }

      const minimumStock =
        parseNonNegativeInteger(
          variant.minimumStock,
        );

      if (
        minimumStock === null
      ) {
        setEditorError(
          `O estoque mínimo da variação ${index + 1} deve ser um número inteiro maior ou igual a zero.`,
        );

        return null;
      }

      const combination =
        [
          color
            .toLocaleLowerCase(
              "pt-BR",
            ),
          size,
        ].join("::");

      if (
        combinations.has(
          combination,
        )
      ) {
        setEditorError(
          `A combinação ${color} / ${size} está repetida.`,
        );

        return null;
      }

      combinations.add(
        combination,
      );

      normalizedVariants.push({
        color,
        size,
        quantity,
        minimumStock,
      });
    }

    return normalizedVariants;
  }

  async function handleSaveInventory(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (
      !selectedInventoryItem ||
      isDeleting
    ) {
      return;
    }

    const validatedVariants =
      validateVariants();

    if (
      validatedVariants ===
      null
    ) {
      return;
    }

    setIsSaving(
      true,
    );

    setEditorError("");
    setEditorSuccess("");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response =
        await updateInventoryItemRequest(
          selectedInventoryItem
            .product.id,
          {
            isActive:
              editorIsActive,

            variants:
              validatedVariants,
          },
        );

      setSelectedInventoryItem(
        response.inventoryItem,
      );

      setEditorIsActive(
        response.inventoryItem
          .isActive,
      );

      setEditableVariants(
        mapInventoryVariants(
          response.inventoryItem,
        ),
      );

      setInventoryItems(
        (currentItems) =>
          currentItems.map(
            (inventoryItem) =>
              inventoryItem
                .product.id ===
              response
                .inventoryItem
                .product.id
                ? response.inventoryItem
                : inventoryItem,
          ),
      );

      setEditorSuccess(
        response.message,
      );

      await loadInventory({
        silent: true,
      });
    } catch (error) {
      setEditorError(
        getErrorMessage(
          error,
        ),
      );
    } finally {
      setIsSaving(
        false,
      );
    }
  }

  async function handleDeleteProduct(): Promise<void> {
    if (
      !selectedInventoryItem
    ) {
      return;
    }

    const productName =
      selectedInventoryItem
        .product.name;

    const confirmed =
      window.confirm(
        `Excluir o produto "${productName}"? Ele será enviado para a lixeira e deixará de aparecer no estoque.`,
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(
      true,
    );

    setEditorError("");
    setEditorSuccess("");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteProductRequest(
        selectedInventoryItem
          .product.id,
      );

      setSelectedInventoryItem(
        null,
      );

      setEditableVariants(
        [],
      );

      setSuccessMessage(
        `O produto "${productName}" foi enviado para a lixeira.`,
      );

      await loadInventory({
        silent: true,
      });
    } catch (error) {
      setEditorError(
        getErrorMessage(
          error,
        ),
      );
    } finally {
      setIsDeleting(
        false,
      );
    }
  }

  function handlePreviousPage(): void {
    setPage(
      (currentPage) =>
        Math.max(
          1,
          currentPage - 1,
        ),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleNextPage(): void {
    setPage(
      (currentPage) =>
        Math.min(
          pagination.totalPages,
          currentPage + 1,
        ),
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            Produtos
          </p>

          <h1>
            Controle de estoque
          </h1>

          <p className="muted-text">
            Organize quantidades, cores,
            tamanhos e disponibilidade dos
            produtos.
          </p>
        </div>

        <HeaderAccount />
      </header>

      <section className="metrics-grid inventory-metrics-grid">
        <article className="metric-card">
          <span>
            Produtos no estoque
          </span>

          <strong>
            {summary.totalProducts}
          </strong>

          <small>
            Produtos cadastrados
          </small>
        </article>

        <article className="metric-card">
          <span>
            Produtos ativos
          </span>

          <strong>
            {summary.activeProducts}
          </strong>

          <small>
            Disponíveis para venda
          </small>
        </article>

        <article className="metric-card">
          <span>
            Produtos inativos
          </span>

          <strong>
            {summary.inactiveProducts}
          </strong>

          <small>
            Ocultos ou pausados
          </small>
        </article>

        <article className="metric-card">
          <span>
            Total de peças
          </span>

          <strong>
            {summary.totalUnits}
          </strong>

          <small>
            Soma de todas as variações
          </small>
        </article>

        <article className="metric-card">
          <span>
            Estoque baixo
          </span>

          <strong>
            {summary.lowStockVariants}
          </strong>

          <small>
            Variações no limite mínimo
          </small>
        </article>

        <article className="metric-card">
          <span>
            Sem estoque
          </span>

          <strong>
            {summary.outOfStockVariants}
          </strong>

          <small>
            Variações zeradas
          </small>
        </article>
      </section>

      <section className="empty-section inventory-filter-section">
        <div className="section-heading">
          <div>
            <h2>
              Localizar produtos
            </h2>

            <p>
              Pesquise por nome, SKU ou
              categoria.
            </p>
          </div>
        </div>

        <form
          className="inventory-filter-form"
          onSubmit={
            handleApplyFilters
          }
        >
          <label className="form-field inventory-search-field">
            <span>
              Pesquisa
            </span>

            <input
              type="search"
              value={
                filterForm.search
              }
              onChange={(event) =>
                setFilterForm(
                  (currentFilters) => ({
                    ...currentFilters,
                    search:
                      event.target
                        .value,
                  }),
                )
              }
              placeholder="Ex.: camiseta, CAM-001 ou básicos"
              maxLength={120}
            />
          </label>

          <label className="form-field">
            <span>
              Status
            </span>

            <select
              value={
                filterForm.status
              }
              onChange={(event) =>
                setFilterForm(
                  (currentFilters) => ({
                    ...currentFilters,

                    status:
                      event.target
                        .value as
                        InventoryFilterState["status"],
                  }),
                )
              }
            >
              <option value="">
                Todos
              </option>

              <option value="active">
                Ativos
              </option>

              <option value="inactive">
                Inativos
              </option>
            </select>
          </label>

          <div className="inventory-filter-actions">
            <button
              type="submit"
              className="primary-button filter-button"
              disabled={
                isLoading
              }
            >
              Aplicar filtros
            </button>

            <button
              type="button"
              className="secondary-button inline-button filter-button"
              onClick={
                handleClearFilters
              }
              disabled={
                isLoading
              }
            >
              Limpar
            </button>

            <button
              type="button"
              className="secondary-button inline-button filter-button"
              onClick={() =>
                void loadInventory({
                  silent: true,
                })
              }
              disabled={
                isLoading ||
                isRefreshing
              }
            >
              {isRefreshing
                ? "Atualizando..."
                : "Atualizar"}
            </button>
          </div>
        </form>
      </section>

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

      <section className="empty-section inventory-list-section">
        <div className="section-heading">
          <div>
            <h2>
              Produtos no estoque
            </h2>

            <p>
              {pagination.total}{" "}
              {pagination.total === 1
                ? "produto encontrado"
                : "produtos encontrados"}
              .
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="muted-text">
            Carregando estoque...
          </p>
        ) : inventoryItems.length ===
          0 ? (
          <div className="inventory-empty-state">
            <h3>
              Nenhum produto encontrado
            </h3>

            <p>
              Os produtos cadastrados
              aparecerão automaticamente
              nesta página.
            </p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table inventory-table">
                <thead>
                  <tr>
                    <th>
                      Produto
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Variações
                    </th>

                    <th>
                      Total de peças
                    </th>

                    <th>
                      Situação
                    </th>

                    <th>
                      Preço
                    </th>

                    <th>
                      Atualizado
                    </th>

                    <th>
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {inventoryItems.map(
                    (inventoryItem) => (
                      <tr
                        key={
                          inventoryItem.id
                        }
                      >
                        <td>
                          <div className="inventory-product-cell">
                            <strong>
                              {
                                inventoryItem
                                  .product
                                  .name
                              }
                            </strong>

                            <span>
                              {inventoryItem
                                .product
                                .sku ??
                                "Sem SKU"}{" "}
                              ·{" "}
                              {
                                inventoryItem
                                  .product
                                  .category
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`product-status-badge ${
                              inventoryItem
                                .isActive
                                ? "product-active"
                                : "product-inactive"
                            }`}
                          >
                            {inventoryItem
                              .isActive
                              ? "Ativo"
                              : "Inativo"}
                          </span>
                        </td>

                        <td>
                          {
                            inventoryItem
                              .variantCount
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              inventoryItem
                                .totalQuantity
                            }
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`inventory-situation-badge ${getStockSituationClass(
                              inventoryItem,
                            )}`}
                          >
                            {getStockSituation(
                              inventoryItem,
                            )}
                          </span>

                          {(inventoryItem
                            .lowStockVariants >
                            0 ||
                            inventoryItem
                              .outOfStockVariants >
                              0) && (
                            <small className="inventory-alert-details">
                              {
                                inventoryItem
                                  .lowStockVariants
                              }{" "}
                              baixo ·{" "}
                              {
                                inventoryItem
                                  .outOfStockVariants
                              }{" "}
                              zerado
                            </small>
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            inventoryItem
                              .product
                              .salePrice,
                          )}
                        </td>

                        <td>
                          {formatDateTime(
                            inventoryItem
                              .updatedAt,
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="table-button"
                            onClick={() =>
                              handleOpenManager(
                                inventoryItem,
                              )
                            }
                          >
                            Gerenciar
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div className="inventory-pagination">
              <button
                type="button"
                className="secondary-button inline-button"
                onClick={
                  handlePreviousPage
                }
                disabled={
                  page <= 1 ||
                  isLoading
                }
              >
                Anterior
              </button>

              <span>
                Página {pagination.page} de{" "}
                {Math.max(
                  pagination.totalPages,
                  1,
                )}
              </span>

              <button
                type="button"
                className="secondary-button inline-button"
                onClick={
                  handleNextPage
                }
                disabled={
                  page >=
                    pagination.totalPages ||
                  pagination.totalPages ===
                    0 ||
                  isLoading
                }
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </section>

      {selectedInventoryItem && (
        <div
          className="inventory-modal-backdrop"
          onMouseDown={
            handleBackdropClick
          }
        >
          <section
            className="inventory-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inventory-modal-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <header className="inventory-modal-header">
              <div className="inventory-modal-title">
                <p className="eyebrow">
                  Gerenciar estoque
                </p>

                <h2 id="inventory-modal-title">
                  {
                    selectedInventoryItem
                      .product.name
                  }
                </h2>

                <p>
                  {selectedInventoryItem
                    .product.sku ??
                    "Sem SKU"}{" "}
                  ·{" "}
                  {
                    selectedInventoryItem
                      .product.category
                  }
                </p>
              </div>

              <button
                type="button"
                className="inventory-modal-close"
                onClick={
                  handleCloseManager
                }
                disabled={
                  isSaving ||
                  isDeleting
                }
                aria-label="Fechar gerenciamento de estoque"
              >
                ×
              </button>
            </header>

            <form
              className="inventory-editor-form"
              onSubmit={
                handleSaveInventory
              }
            >
              <div className="inventory-modal-body">
                <div className="inventory-status-control">
                  <div>
                    <strong>
                      Status do produto
                    </strong>

                    <p>
                      Esta alteração também
                      atualiza a lista de
                      produtos ativos e
                      inativos.
                    </p>
                  </div>

                  <label className="inventory-status-select">
                    <span>
                      Disponibilidade
                    </span>

                    <select
                      value={
                        editorIsActive
                          ? "active"
                          : "inactive"
                      }
                      onChange={(event) =>
                        setEditorIsActive(
                          event.target
                            .value ===
                            "active",
                        )
                      }
                      disabled={
                        isSaving ||
                        isDeleting
                      }
                    >
                      <option value="active">
                        Ativo
                      </option>

                      <option value="inactive">
                        Inativo
                      </option>
                    </select>
                  </label>
                </div>

                <div className="inventory-available-grid">
                  <section className="inventory-available-group">
                    <div>
                      <strong>
                        Cores disponíveis
                      </strong>

                      <span>
                        {
                          availableColors.length
                        }{" "}
                        {availableColors.length ===
                        1
                          ? "cor"
                          : "cores"}
                      </span>
                    </div>

                    {availableColors.length ===
                    0 ? (
                      <p>
                        Nenhuma cor
                        cadastrada.
                      </p>
                    ) : (
                      <div className="inventory-chip-list">
                        {availableColors.map(
                          (color) => (
                            <span
                              key={
                                color.toLocaleLowerCase(
                                  "pt-BR",
                                )
                              }
                              className="inventory-availability-chip"
                            >
                              {color}

                              <button
                                type="button"
                                className="inventory-chip-remove"
                                onClick={() =>
                                  handleRemoveColor(
                                    color,
                                  )
                                }
                                disabled={
                                  isSaving ||
                                  isDeleting
                                }
                                aria-label={`Excluir a cor ${color}`}
                                title={`Excluir todas as variações da cor ${color}`}
                              >
                                ×
                              </button>
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </section>

                  <section className="inventory-available-group">
                    <div>
                      <strong>
                        Tamanhos disponíveis
                      </strong>

                      <span>
                        {
                          availableSizes.length
                        }{" "}
                        {availableSizes.length ===
                        1
                          ? "tamanho"
                          : "tamanhos"}
                      </span>
                    </div>

                    {availableSizes.length ===
                    0 ? (
                      <p>
                        Nenhum tamanho
                        cadastrado.
                      </p>
                    ) : (
                      <div className="inventory-chip-list">
                        {availableSizes.map(
                          (size) => (
                            <span
                              key={
                                size
                              }
                              className="inventory-availability-chip"
                            >
                              {size}

                              <button
                                type="button"
                                className="inventory-chip-remove"
                                onClick={() =>
                                  handleRemoveSize(
                                    size,
                                  )
                                }
                                disabled={
                                  isSaving ||
                                  isDeleting
                                }
                                aria-label={`Excluir o tamanho ${size}`}
                                title={`Excluir todas as variações do tamanho ${size}`}
                              >
                                ×
                              </button>
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </section>
                </div>

                <div className="inventory-variants-heading">
                  <div>
                    <h3>
                      Variações cadastradas
                    </h3>

                    <p>
                      Cada linha representa
                      uma combinação de cor e
                      tamanho.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="secondary-button inline-button"
                    onClick={
                      handleAddVariant
                    }
                    disabled={
                      isSaving ||
                      isDeleting
                    }
                  >
                    Adicionar variação
                  </button>
                </div>

                {editableVariants.length ===
                0 ? (
                  <div className="inventory-empty-variants">
                    <strong>
                      Nenhuma variação
                      cadastrada
                    </strong>

                    <p>
                      Adicione a primeira
                      combinação de cor,
                      tamanho e quantidade.
                    </p>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={
                        handleAddVariant
                      }
                      disabled={
                        isSaving ||
                        isDeleting
                      }
                    >
                      Adicionar primeira
                      variação
                    </button>
                  </div>
                ) : (
                  <div className="inventory-variant-list">
                    {editableVariants.map(
                      (
                        variant,
                        index,
                      ) => (
                        <article
                          key={
                            variant.clientId
                          }
                          className="inventory-variant-card"
                        >
                          <div className="inventory-variant-number">
                            <span>
                              Variação
                            </span>

                            <strong>
                              {index + 1}
                            </strong>
                          </div>

                          <label className="form-field">
                            <span>
                              Cor
                            </span>

                            <select
                              value={
                                variant.color
                              }
                              onChange={(event) =>
                                updateVariantField(
                                  variant.clientId,
                                  "color",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                isSaving ||
                                isDeleting
                              }
                              required
                            >
                              <option value="">
                                Selecione
                              </option>

                              {allowedColors.map(
                                (color) => (
                                  <option
                                    key={
                                      color
                                    }
                                    value={
                                      color
                                    }
                                  >
                                    {color}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label className="form-field">
                            <span>
                              Tamanho
                            </span>

                            <select
                              value={
                                variant.size
                              }
                              onChange={(event) =>
                                updateVariantField(
                                  variant.clientId,
                                  "size",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                isSaving ||
                                isDeleting
                              }
                              required
                            >
                              <option value="">
                                Selecione
                              </option>

                              {allowedSizes.map(
                                (size) => (
                                  <option
                                    key={
                                      size
                                    }
                                    value={
                                      size
                                    }
                                  >
                                    {size}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label className="form-field">
                            <span>
                              Quantidade
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                variant.quantity
                              }
                              onChange={(event) =>
                                updateVariantField(
                                  variant.clientId,
                                  "quantity",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                isSaving ||
                                isDeleting
                              }
                            />
                          </label>

                          <label className="form-field">
                            <span>
                              Estoque mínimo
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={
                                variant.minimumStock
                              }
                              onChange={(event) =>
                                updateVariantField(
                                  variant.clientId,
                                  "minimumStock",
                                  event.target
                                    .value,
                                )
                              }
                              disabled={
                                isSaving ||
                                isDeleting
                              }
                            />
                          </label>

                          <button
                            type="button"
                            className="table-button danger-button inventory-remove-variant"
                            onClick={() =>
                              handleRemoveVariant(
                                variant.clientId,
                              )
                            }
                            disabled={
                              isSaving ||
                              isDeleting
                            }
                          >
                            Excluir variação
                          </button>
                        </article>
                      ),
                    )}
                  </div>
                )}

                {editorError && (
                  <div
                    className="error-message"
                    role="alert"
                  >
                    {editorError}
                  </div>
                )}

                {editorSuccess && (
                  <div
                    className="success-message"
                    role="status"
                  >
                    {editorSuccess}
                  </div>
                )}
              </div>

              <footer className="inventory-modal-footer">
                <span>
                  {
                    editableVariants.length
                  }{" "}
                  {editableVariants.length ===
                  1
                    ? "variação configurada"
                    : "variações configuradas"}
                </span>

                <div>
                  <button
                    type="button"
                    className="table-button danger-button"
                    onClick={() =>
                      void handleDeleteProduct()
                    }
                    disabled={
                      isSaving ||
                      isDeleting
                    }
                  >
                    {isDeleting
                      ? "Excluindo..."
                      : "Excluir produto"}
                  </button>

                  <button
                    type="button"
                    className="secondary-button inline-button"
                    onClick={
                      handleCloseManager
                    }
                    disabled={
                      isSaving ||
                      isDeleting
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={
                      isSaving ||
                      isDeleting
                    }
                  >
                    {isSaving
                      ? "Salvando..."
                      : "Salvar estoque"}
                  </button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}