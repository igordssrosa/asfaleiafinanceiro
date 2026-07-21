import {
  model,
  Schema,
  Types,
} from "mongoose";

export type ProductStatus =
  | "active"
  | "inactive";

export interface IProduct {
  name: string;
  sku: string | null;
  category: string;
  description: string | null;

  unitCostCents: number;
  salePriceCents: number;

  status: ProductStatus;
  notes: string | null;

  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;

  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const productSchema =
  new Schema<IProduct>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },

      sku: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: 50,
        default: null,
      },

      category: {
        type: String,
        required: true,
        trim: true,
        maxlength: 60,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },

      unitCostCents: {
        type: Number,
        required: true,
        min: 0,
      },

      salePriceCents: {
        type: Number,
        required: true,
        min: 0,
      },

      status: {
        type: String,
        enum: [
          "active",
          "inactive",
        ],
        default: "active",
        required: true,
      },

      notes: {
        type: String,
        trim: true,
        maxlength: 500,
        default: null,
      },

      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      deletedAt: {
        type: Date,
        default: null,
      },

      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
      collection: "products",
    },
  );

productSchema.index({
  deletedAt: 1,
  status: 1,
  category: 1,
});

productSchema.index({
  name: 1,
});

productSchema.index(
  {
    sku: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      sku: {
        $type: "string",
      },
    },
  },
);

export const ProductModel =
  model<IProduct>(
    "Product",
    productSchema,
  );