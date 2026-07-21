import {
  model,
  Schema,
  Types,
} from "mongoose";

export type TransactionType =
  | "income"
  | "expense";

export type TransactionStatus =
  | "completed"
  | "pending";

export type PaymentMethod =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "bank_transfer"
  | "cash"
  | "boleto"
  | "other";

export interface ITransaction {
  type: TransactionType;
  description: string;
  amountCents: number;
  category: string;
  date: string;
  paymentMethod: PaymentMethod;
  status: TransactionStatus;
  notes: string | null;

  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;

  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema =
  new Schema<ITransaction>(
    {
      type: {
        type: String,
        enum: ["income", "expense"],
        required: true,
        index: true,
      },

      description: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 120,
      },

      amountCents: {
        type: Number,
        required: true,
        min: 1,
      },

      category: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 60,
        index: true,
      },

      date: {
        type: String,
        required: true,
        match: /^\d{4}-\d{2}-\d{2}$/,
        index: true,
      },

      paymentMethod: {
        type: String,
        enum: [
          "pix",
          "credit_card",
          "debit_card",
          "bank_transfer",
          "cash",
          "boleto",
          "other",
        ],
        required: true,
      },

      status: {
        type: String,
        enum: ["completed", "pending"],
        default: "completed",
        required: true,
        index: true,
      },

      notes: {
        type: String,
        default: null,
        trim: true,
        maxlength: 500,
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
        index: true,
      },

      deletedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      timestamps: true,
      versionKey: false,
    },
  );

transactionSchema.index({
  deletedAt: 1,
  date: -1,
});

transactionSchema.index({
  type: 1,
  status: 1,
  date: -1,
});

export const TransactionModel =
  model<ITransaction>(
    "Transaction",
    transactionSchema,
  );