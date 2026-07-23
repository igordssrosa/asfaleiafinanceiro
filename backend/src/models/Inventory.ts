import {
  model,
  Schema,
  Types,
} from "mongoose";

export interface InventoryVariant {
  _id?: Types.ObjectId;

  color: string;

  size: string;

  quantity: number;

  minimumStock: number;
}

export interface IInventory {
  productId: Types.ObjectId;

  /*
   * O status será sincronizado com o produto.
   *
   * Ao desativar no estoque, o produto também
   * ficará inativo na página de produtos.
   */
  isActive: boolean;

  variants: InventoryVariant[];

  createdAt: Date;

  updatedAt: Date;
}

const inventoryVariantSchema =
  new Schema<InventoryVariant>(
    {
      color: {
        type: String,

        required: true,

        trim: true,

        maxlength: 60,
      },

      size: {
        type: String,

        required: true,

        trim: true,

        uppercase: true,

        maxlength: 20,
      },

      quantity: {
        type: Number,

        required: true,

        min: 0,

        max: 1_000_000,

        default: 0,

        validate: {
          validator:
            Number.isInteger,

          message:
            "A quantidade precisa ser um número inteiro.",
        },
      },

      /*
       * Quantidade usada futuramente para
       * mostrar alertas de estoque baixo.
       */
      minimumStock: {
        type: Number,

        required: true,

        min: 0,

        max: 1_000_000,

        default: 0,

        validate: {
          validator:
            Number.isInteger,

          message:
            "O estoque mínimo precisa ser um número inteiro.",
        },
      },
    },
    {
      _id: true,

      id: false,
    },
  );

const inventorySchema =
  new Schema<IInventory>(
    {
      productId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "Product",

        required:
          true,
      },

      isActive: {
        type:
          Boolean,

        required:
          true,

        default:
          true,
      },

      variants: {
        type: [
          inventoryVariantSchema,
        ],

        default:
          [],

        validate: {
          validator(
            variants:
              InventoryVariant[],
          ): boolean {
            const combinations =
              variants.map(
                (variant) => {
                  const normalizedColor =
                    variant.color
                      .trim()
                      .toLocaleLowerCase(
                        "pt-BR",
                      );

                  const normalizedSize =
                    variant.size
                      .trim()
                      .toLocaleUpperCase(
                        "pt-BR",
                      );

                  return (
                    `${normalizedColor}::` +
                    normalizedSize
                  );
                },
              );

            return (
              new Set(
                combinations,
              ).size ===
              combinations.length
            );
          },

          message:
            "Não é permitido repetir a mesma combinação de cor e tamanho.",
        },
      },
    },
    {
      collection:
        "inventory_items",

      timestamps:
        true,
    },
  );

/*
 * Garante que cada produto tenha apenas
 * um registro principal de estoque.
 */
inventorySchema.index(
  {
    productId:
      1,
  },
  {
    unique:
      true,

    name:
      "inventory_product_unique",
  },
);

/*
 * Usado para filtrar itens ativos e inativos.
 */
inventorySchema.index({
  isActive:
    1,

  updatedAt:
    -1,
});

/*
 * Usado para ordenar os estoques alterados
 * recentemente.
 */
inventorySchema.index({
  updatedAt:
    -1,
});

export const InventoryModel =
  model<IInventory>(
    "Inventory",
    inventorySchema,
  );