import {
  model,
  Schema,
  Types,
  type InferSchemaType,
} from "mongoose";

const sessionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    userAgent: {
      type: String,
      default: null,
      maxlength: 500,
    },

    ipAddress: {
      type: String,
      default: null,
      maxlength: 100,
    },

    lastUsedAt: {
      type: Date,
      default: Date.now,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

sessionSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    name: "delete_expired_sessions",
  },
);

export type Session = InferSchemaType<typeof sessionSchema>;

export type SessionDocument = Session & {
  _id: Types.ObjectId;
};

export const SessionModel = model("Session", sessionSchema);