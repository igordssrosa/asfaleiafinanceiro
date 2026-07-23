import {
  useState,
  type FormEvent,
} from "react";

import {
  ApiError,
} from "../api/api";

import {
  createProductRequest,
} from "../api/products";

import {
  HeaderAccount,
} from "../components/HeaderAccount";

type ProductFormState = {
  name: string;
  sku: string;
  category: string;
  description: string;
  unitCost: string;
  salePrice: string;
  notes: string;
};

const initialForm: ProductFormState = {
  name: "",
  sku: "",
  category: "",
  description: "",
  unitCost: "",
  salePrice: "",
  notes: "",
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

export function ProductsPage() {
  const [
    form,
    setForm,
  ] = useState<ProductFormState>(
    initialForm,
  );

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

  function updateForm<
    Key extends keyof ProductFormState,
  >(
    field: Key,
    value: ProductFormState[Key],
  ): void {
    setForm(
      (currentForm) => ({
        ...currentForm,
        [field]: value,
      }),
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  function resetForm(): void {
    setForm({
      ...initialForm,
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    const unitCost =
      parseDecimal(
        form.unitCost,
      );

    const salePrice =
      parseDecimal(
        form.salePrice,
      );

    if (
      !Number.isFinite(
        unitCost,
      ) ||
      unitCost < 0
    ) {
      setErrorMessage(
        "Informe um custo unitário válido.",
      );

      return;
    }

    if (
      !Number.isFinite(
        salePrice,
      ) ||
      salePrice < 0
    ) {
      setErrorMessage(
        "Informe um preço de venda válido.",
      );

      return;
    }

    setIsSubmitting(
      true,
    );

    try {
      await createProductRequest({
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

        /*
         * Todo produto entra inicialmente ativo.
         * Depois, o status pode ser controlado
         * diretamente pela página de Estoque.
         */
        status:
          "active",

        notes:
          form.notes.trim() ||
          null,
      });

      resetForm();

      setSuccessMessage(
        "Produto cadastrado com sucesso e enviado ao estoque.",
      );
    } catch (error) {
      if (
        error instanceof
        ApiError
      ) {
        setErrorMessage(
          error.message,
        );
      } else {
        setErrorMessage(
          "Não foi possível salvar o produto.",
        );
      }
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  return (
    <>
      <header className="dashboard-header product-page-header">
        <div>
          <p className="eyebrow">
            Catálogo
          </p>

          <h1>
            Produtos
          </h1>

          <p className="muted-text">
            Cadastre novos produtos da
            Asfaleia. Quantidades, cores,
            tamanhos e disponibilidade são
            gerenciados na página de Estoque.
          </p>
        </div>

        <HeaderAccount />
      </header>

      <section className="empty-section">
        <div className="section-heading">
          <div>
            <h2>
              Novo produto
            </h2>

            <p>
              Custos e preços são registrados
              por unidade.
            </p>
          </div>
        </div>

        <form
          className="product-form"
          onSubmit={
            handleSubmit
          }
        >
          <div className="form-grid">
            <label className="form-field">
              <span>
                Nome do produto
              </span>

              <input
                type="text"
                value={
                  form.name
                }
                onChange={(event) =>
                  updateForm(
                    "name",
                    event.target.value,
                  )
                }
                required
                minLength={2}
                maxLength={120}
                disabled={
                  isSubmitting
                }
                placeholder="Ex.: Camiseta básica"
              />
            </label>

            <label className="form-field">
              <span>
                SKU
              </span>

              <input
                type="text"
                value={
                  form.sku
                }
                onChange={(event) =>
                  updateForm(
                    "sku",
                    event.target.value,
                  )
                }
                maxLength={50}
                disabled={
                  isSubmitting
                }
                placeholder="Ex.: CAM-BAS-001"
              />
            </label>

            <label className="form-field">
              <span>
                Categoria
              </span>

              <input
                type="text"
                list="product-categories"
                value={
                  form.category
                }
                onChange={(event) =>
                  updateForm(
                    "category",
                    event.target.value,
                  )
                }
                required
                minLength={2}
                maxLength={60}
                disabled={
                  isSubmitting
                }
                placeholder="Ex.: Camisetas"
              />

              <datalist id="product-categories">
                {categorySuggestions.map(
                  (category) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    />
                  ),
                )}
              </datalist>
            </label>

            <label className="form-field">
              <span>
                Custo unitário
              </span>

              <input
                type="text"
                inputMode="decimal"
                value={
                  form.unitCost
                }
                onChange={(event) =>
                  updateForm(
                    "unitCost",
                    event.target.value,
                  )
                }
                required
                disabled={
                  isSubmitting
                }
                placeholder="0,00"
              />
            </label>

            <label className="form-field">
              <span>
                Preço de venda
              </span>

              <input
                type="text"
                inputMode="decimal"
                value={
                  form.salePrice
                }
                onChange={(event) =>
                  updateForm(
                    "salePrice",
                    event.target.value,
                  )
                }
                required
                disabled={
                  isSubmitting
                }
                placeholder="0,00"
              />
            </label>

            <label className="form-field full-width">
              <span>
                Descrição
              </span>

              <textarea
                value={
                  form.description
                }
                onChange={(event) =>
                  updateForm(
                    "description",
                    event.target.value,
                  )
                }
                maxLength={500}
                disabled={
                  isSubmitting
                }
                rows={3}
                placeholder="Descrição do produto"
              />
            </label>

            <label className="form-field full-width">
              <span>
                Observações
              </span>

              <textarea
                value={
                  form.notes
                }
                onChange={(event) =>
                  updateForm(
                    "notes",
                    event.target.value,
                  )
                }
                maxLength={500}
                disabled={
                  isSubmitting
                }
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
            disabled={
              isSubmitting
            }
          >
            {isSubmitting
              ? "Salvando..."
              : "Cadastrar produto"}
          </button>
        </form>
      </section>
    </>
  );
}