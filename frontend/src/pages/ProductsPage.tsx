import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { ApiError } from "../api/api";

import {
  createProductRequest,
  deleteProductRequest,
  listProductsRequest,
  updateProductRequest,
} from "../api/products";

import { HeaderAccount } from "../components/HeaderAccount";

import type {
  Product,
  ProductStatus,
} from "../types/product";

import {
  formatCurrency,
} from "../utils/format";

type ProductFormState = {
  name: string;
  sku: string;
  category: string;
  description: string;
  unitCost: string;
  salePrice: string;
  status: ProductStatus;
  notes: string;
};

type ProductFilters = {
  search: string;
  category: string;
  status: "" | ProductStatus;
};

const initialForm: ProductFormState = {
  name: "",
  sku: "",
  category: "",
  description: "",
  unitCost: "",
  salePrice: "",
  status: "active",
  notes: "",
};

const initialFilters: ProductFilters = {
  search: "",
  category: "",
  status: "",
};

const categorySuggestions = [
  "Camisetas",
  "Cropped",
  "Regatas",
  "Shorts",
  "Bermudas",
  "Calças",
  "Conjuntos",
  "Vestidos",
  "Acessórios",
  "Outros",
];

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

function calculateGrossProfit(
  product: Product,
): number {
  return (
    product.salePrice -
    product.unitCost
  );
}

function calculateGrossMargin(
  product: Product,
): number {
  if (product.salePrice <= 0) {
    return 0;
  }

  return (
    calculateGrossProfit(product) /
    product.salePrice
  ) * 100;
}

export function ProductsPage() {
  const [
    products,
    setProducts,
  ] = useState<Product[]>([]);

  const [
    form,
    setForm,
  ] = useState<ProductFormState>(
    initialForm,
  );

  const [
    filters,
    setFilters,
  ] = useState<ProductFilters>(
    initialFilters,
  );

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<ProductFilters>(
    initialFilters,
  );

  const [
    editingId,
    setEditingId,
  ] = useState<string | null>(null);

  const [
    totalProducts,
    setTotalProducts,
  ] = useState(0);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const loadProducts =
    useCallback(async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response =
          await listProductsRequest({
            search:
              appliedFilters.search.trim() ||
              undefined,

            category:
              appliedFilters.category.trim() ||
              undefined,

            status:
              appliedFilters.status ||
              undefined,

            page: 1,
            limit: 100,
          });

        setProducts(
          response.products,
        );

        setTotalProducts(
          response.pagination.total,
        );
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(
            error.message,
          );
        } else {
          setErrorMessage(
            "Não foi possível carregar os produtos.",
          );
        }
      } finally {
        setIsLoading(false);
      }
    }, [appliedFilters]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function updateForm<
    Key extends keyof ProductFormState,
  >(
    field: Key,
    value: ProductFormState[Key],
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));

    setSuccessMessage("");
  }

  function updateFilter<
    Key extends keyof ProductFilters,
  >(
    field: Key,
    value: ProductFilters[Key],
  ): void {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  }

  function resetForm(): void {
    setEditingId(null);
    setForm(initialForm);
    setErrorMessage("");
  }

  function handleFilterSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setAppliedFilters({
      search: filters.search,
      category: filters.category,
      status: filters.status,
    });
  }

  function clearFilters(): void {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const unitCost =
      parseDecimal(form.unitCost);

    const salePrice =
      parseDecimal(form.salePrice);

    if (
      !Number.isFinite(unitCost) ||
      unitCost < 0
    ) {
      setErrorMessage(
        "Informe um custo unitário válido.",
      );

      return;
    }

    if (
      !Number.isFinite(salePrice) ||
      salePrice < 0
    ) {
      setErrorMessage(
        "Informe um preço de venda válido.",
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const input = {
        name:
          form.name.trim(),

        sku:
          form.sku.trim() ||
          null,

        category:
          form.category.trim(),

        description:
          form.description.trim() ||
          null,

        unitCost,
        salePrice,

        status:
          form.status,

        notes:
          form.notes.trim() ||
          null,
      };

      if (editingId) {
        await updateProductRequest(
          editingId,
          input,
        );

        setSuccessMessage(
          "Produto atualizado com sucesso.",
        );
      } else {
        await createProductRequest(
          input,
        );

        setSuccessMessage(
          "Produto cadastrado com sucesso.",
        );
      }

      resetForm();

      await loadProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(
          error.message,
        );
      } else {
        setErrorMessage(
          "Não foi possível salvar o produto.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(
    product: Product,
  ): void {
    setEditingId(
      product.id,
    );

    setForm({
      name:
        product.name,

      sku:
        product.sku ?? "",

      category:
        product.category,

      description:
        product.description ?? "",

      unitCost:
        numberToInput(
          product.unitCost,
        ),

      salePrice:
        numberToInput(
          product.salePrice,
        ),

      status:
        product.status,

      notes:
        product.notes ?? "",
    });

    setErrorMessage("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(
    product: Product,
  ): Promise<void> {
    const confirmed =
      window.confirm(
        `Enviar "${product.name}" para a lixeira?`,
      );

    if (!confirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await deleteProductRequest(
        product.id,
      );

      if (
        editingId === product.id
      ) {
        resetForm();
      }

      setSuccessMessage(
        "Produto enviado para a lixeira.",
      );

      await loadProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(
          error.message,
        );
      } else {
        setErrorMessage(
          "Não foi possível excluir o produto.",
        );
      }
    }
  }

  const activeProducts =
    products.filter(
      (product) =>
        product.status === "active",
    ).length;

  const inactiveProducts =
    products.filter(
      (product) =>
        product.status === "inactive",
    ).length;

  return (
    <>
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">
            Catálogo
          </p>

          <h1>Produtos</h1>

          <p className="muted-text">
            Cadastre e organize os produtos
            da Asfaleia.
          </p>
        </div>

        <HeaderAccount />
      </header>

      <section className="metrics-grid compact-metrics">
        <article className="metric-card">
          <span>Total encontrado</span>

          <strong>
            {totalProducts}
          </strong>

          <small>
            Produtos com os filtros atuais
          </small>
        </article>

        <article className="metric-card">
          <span>Ativos na lista</span>

          <strong>
            {activeProducts}
          </strong>

          <small>
            Disponíveis para venda
          </small>
        </article>

        <article className="metric-card">
          <span>Inativos na lista</span>

          <strong>
            {inactiveProducts}
          </strong>

          <small>
            Produtos pausados
          </small>
        </article>

        <article className="metric-card">
          <span>Valor potencial</span>

          <strong>
            {formatCurrency(
              products.reduce(
                (
                  total,
                  product,
                ) =>
                  total +
                  product.salePrice,
                0,
              ),
            )}
          </strong>

          <small>
            Soma dos preços da lista
          </small>
        </article>
      </section>

      <section className="empty-section">
        <div className="section-heading">
          <div>
            <h2>
              {editingId
                ? "Editar produto"
                : "Novo produto"}
            </h2>

            <p>
              Custos e preços são registrados
              por unidade.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              className="secondary-button inline-button"
              onClick={resetForm}
            >
              Cancelar edição
            </button>
          )}
        </div>

        <form
          className="product-form"
          onSubmit={handleSubmit}
        >
          <div className="form-grid">
            <label className="form-field">
              <span>Nome do produto</span>

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
                disabled={isSubmitting}
                placeholder="Ex.: Camiseta básica"
              />
            </label>

            <label className="form-field">
              <span>SKU</span>

              <input
                type="text"
                value={form.sku}
                onChange={(event) =>
                  updateForm(
                    "sku",
                    event.target.value,
                  )
                }
                maxLength={50}
                disabled={isSubmitting}
                placeholder="Ex.: CAM-BAS-001"
              />
            </label>

            <label className="form-field">
              <span>Categoria</span>

              <input
                type="text"
                list="product-categories"
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
                placeholder="Ex.: Camisetas"
              />

              <datalist id="product-categories">
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
              <span>Status</span>

              <select
                value={form.status}
                onChange={(event) =>
                  updateForm(
                    "status",
                    event.target
                      .value as ProductStatus,
                  )
                }
                disabled={isSubmitting}
              >
                <option value="active">
                  Ativo
                </option>

                <option value="inactive">
                  Inativo
                </option>
              </select>
            </label>

            <label className="form-field">
              <span>Custo unitário</span>

              <input
                type="text"
                inputMode="decimal"
                value={form.unitCost}
                onChange={(event) =>
                  updateForm(
                    "unitCost",
                    event.target.value,
                  )
                }
                required
                disabled={isSubmitting}
                placeholder="0,00"
              />
            </label>

            <label className="form-field">
              <span>Preço de venda</span>

              <input
                type="text"
                inputMode="decimal"
                value={form.salePrice}
                onChange={(event) =>
                  updateForm(
                    "salePrice",
                    event.target.value,
                  )
                }
                required
                disabled={isSubmitting}
                placeholder="0,00"
              />
            </label>

            <label className="form-field full-width">
              <span>Descrição</span>

              <textarea
                value={form.description}
                onChange={(event) =>
                  updateForm(
                    "description",
                    event.target.value,
                  )
                }
                maxLength={500}
                disabled={isSubmitting}
                rows={3}
                placeholder="Descrição do produto"
              />
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
                rows={3}
                placeholder="Informações internas"
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
            type="submit"
            className="primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Salvando..."
              : editingId
                ? "Salvar alterações"
                : "Cadastrar produto"}
          </button>
        </form>
      </section>

      <section className="empty-section">
        <div className="section-heading">
          <div>
            <h2>Produtos cadastrados</h2>

            <p>
              Pesquise por nome, SKU ou
              categoria.
            </p>
          </div>
        </div>

        <form
          className="product-filters"
          onSubmit={handleFilterSubmit}
        >
          <label className="form-field">
            <span>Pesquisa</span>

            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                updateFilter(
                  "search",
                  event.target.value,
                )
              }
              placeholder="Nome, SKU ou categoria"
            />
          </label>

          <label className="form-field">
            <span>Categoria</span>

            <input
              type="text"
              value={filters.category}
              onChange={(event) =>
                updateFilter(
                  "category",
                  event.target.value,
                )
              }
              list="filter-product-categories"
              placeholder="Todas"
            />

            <datalist id="filter-product-categories">
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
            <span>Status</span>

            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value as
                    | ""
                    | ProductStatus,
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

          <div className="product-filter-actions">
            <button
              type="submit"
              className="primary-button filter-button"
            >
              Filtrar
            </button>

            <button
              type="button"
              className="secondary-button filter-button"
              onClick={clearFilters}
            >
              Limpar filtros
            </button>
          </div>
        </form>

        {isLoading ? (
          <p>Carregando produtos...</p>
        ) : products.length === 0 ? (
          <div className="trash-empty-state">
            <h3>
              Nenhum produto encontrado
            </h3>

            <p>
              Cadastre um produto ou altere
              os filtros.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table product-table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th>Custo</th>
                  <th>Preço</th>
                  <th>Lucro bruto</th>
                  <th>Margem bruta</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {products.map(
                  (product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>
                          {product.name}
                        </strong>
                      </td>

                      <td>
                        {product.sku ?? "-"}
                      </td>

                      <td>
                        {product.category}
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
                        {formatCurrency(
                          calculateGrossProfit(
                            product,
                          ),
                        )}
                      </td>

                      <td>
                        {calculateGrossMargin(
                          product,
                        ).toFixed(2)}
                        %
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="table-button"
                            onClick={() =>
                              handleEdit(product)
                            }
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="table-button danger-button"
                            onClick={() =>
                              void handleDelete(
                                product,
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