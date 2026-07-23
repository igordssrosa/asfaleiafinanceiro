import { model, Schema } from "mongoose";


export type UserRole = "owner";

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["owner"],
      default: "owner",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    name: "unique_user_email",
  },
);

export const UserModel =
  model<IUser>(
    "User",
    userSchema,
  );
