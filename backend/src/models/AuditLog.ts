import {
  model,
  Schema,
  Types,
} from "mongoose";

/*
 * Os logs serão mantidos durante 7 dias.
 * Depois disso, o MongoDB os exclui
 * automaticamente pelo índice TTL.
 */
export const AUDIT_LOG_RETENTION_DAYS =
  7;

const AUDIT_LOG_RETENTION_SECONDS =
  AUDIT_LOG_RETENTION_DAYS *
  24 *
  60 *
  60;

export const auditLogActions = [
  "create",
  "update",
  "move_to_trash",
  "restore",
  "permanent_delete",
  "login",
  "logout",
] as const;

export const auditLogResources = [
  "transaction",
  "product",
  "pricing_calculation",
  "authentication",
] as const;

export type AuditLogAction =
  (typeof auditLogActions)[number];

export type AuditLogResource =
  (typeof auditLogResources)[number];

export interface IAuditLog {
  actorId:
    Types.ObjectId;

  actorName:
    string;

  actorEmail:
    string;

  action:
    AuditLogAction;

  resource:
    AuditLogResource;

  resourceId:
    string;

  description:
    string;

  metadata:
    Record<
      string,
      unknown
    >;

  ipAddress:
    string | null;

  userAgent:
    string | null;

  createdAt:
    Date;
}

const auditLogSchema =
  new Schema<IAuditLog>(
    {
      actorId: {
        type:
          Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,
      },

      actorName: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,
      },

      actorEmail: {
        type:
          String,

        required:
          true,

        trim:
          true,

        lowercase:
          true,

        maxlength:
          180,
      },

      action: {
        type:
          String,

        enum:
          auditLogActions,

        required:
          true,
      },

      resource: {
        type:
          String,

        enum:
          auditLogResources,

        required:
          true,
      },

      resourceId: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      description: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          500,
      },

      metadata: {
        type:
          Schema.Types.Mixed,

        default:
          () => ({}),
      },

      ipAddress: {
        type:
          String,

        default:
          null,
      },

      userAgent: {
        type:
          String,

        default:
          null,

        maxlength:
          500,
      },
    },
    {
      collection:
        "audit_logs",

      timestamps: {
        createdAt:
          true,

        updatedAt:
          false,
      },
    },
  );

/*
 * Exclusão automática dos logs após 7 dias.
 */
auditLogSchema.index(
  {
    createdAt:
      1,
  },
  {
    expireAfterSeconds:
      AUDIT_LOG_RETENTION_SECONDS,

    name:
      "audit_logs_expiration_ttl",
  },
);

auditLogSchema.index({
  actorId:
    1,

  createdAt:
    -1,
});

auditLogSchema.index({
  resource:
    1,

  action:
    1,

  createdAt:
    -1,
});

auditLogSchema.index({
  resource:
    1,

  resourceId:
    1,

  createdAt:
    -1,
});

export const AuditLogModel =
  model<IAuditLog>(
    "AuditLog",
    auditLogSchema,
  );