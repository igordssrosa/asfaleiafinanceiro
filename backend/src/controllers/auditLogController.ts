import type {
  Request,
  Response,
} from "express";

import {
  z,
} from "zod";

import {
  AuditLogModel,
  auditLogActions,
  auditLogResources,
} from "../models/AuditLog.js";

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "A data deve estar no formato AAAA-MM-DD.",
  )
  .refine(
    (value) => {
      const [
        year,
        month,
        day,
      ] = value
        .split("-")
        .map(Number);

      const date =
        new Date(
          Date.UTC(
            year,
            month - 1,
            day,
          ),
        );

      return (
        date.getUTCFullYear() ===
          year &&
        date.getUTCMonth() ===
          month - 1 &&
        date.getUTCDate() ===
          day
      );
    },
    "Data inválida.",
  );

const listAuditLogsSchema =
  z.object({
    action: z
      .enum(
        auditLogActions,
      )
      .optional(),

    resource: z
      .enum(
        auditLogResources,
      )
      .optional(),

    search: z
      .string()
      .trim()
      .max(120)
      .optional(),

    from:
      dateSchema.optional(),

    to:
      dateSchema.optional(),

    page: z.coerce
      .number()
      .int()
      .min(1)
      .default(1),

    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(30),
  });

function escapeRegularExpression(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function serializeAuditLog(
  log: {
    _id: {
      toString(): string;
    };

    actorId: {
      toString(): string;
    };

    actorName: string;
    actorEmail: string;

    action: string;
    resource: string;

    resourceId: string;
    description: string;

    metadata: Record<
      string,
      unknown
    >;

    ipAddress:
      | string
      | null;

    userAgent:
      | string
      | null;

    createdAt: Date;
  },
) {
  return {
    id:
      log._id.toString(),

    actor: {
      id:
        log.actorId.toString(),

      name:
        log.actorName,

      email:
        log.actorEmail,
    },

    action:
      log.action,

    resource:
      log.resource,

    resourceId:
      log.resourceId,

    description:
      log.description,

    metadata:
      log.metadata,

    ipAddress:
      log.ipAddress,

    userAgent:
      log.userAgent,

    createdAt:
      log.createdAt,
  };
}

export async function listAuditLogs(
  request: Request,
  response: Response,
): Promise<void> {
  const parsedQuery =
    listAuditLogsSchema.safeParse(
      request.query,
    );

  if (
    !parsedQuery.success
  ) {
    response
      .status(400)
      .json({
        message:
          "Filtros dos logs inválidos.",

        errors:
          parsedQuery.error
            .flatten()
            .fieldErrors,
      });

    return;
  }

  const {
    action,
    resource,
    search,
    from,
    to,
    page,
    limit,
  } = parsedQuery.data;

  const filter:
    Record<
      string,
      unknown
    > = {};

  if (action) {
    filter.action =
      action;
  }

  if (resource) {
    filter.resource =
      resource;
  }

  if (search) {
    const expression =
      new RegExp(
        escapeRegularExpression(
          search,
        ),
        "i",
      );

    filter.$or = [
      {
        actorName:
          expression,
      },

      {
        actorEmail:
          expression,
      },

      {
        description:
          expression,
      },

      {
        resourceId:
          expression,
      },
    ];
  }

  if (
    from ||
    to
  ) {
    const createdAtFilter:
      Record<
        string,
        Date
      > = {};

    if (from) {
      createdAtFilter.$gte =
        new Date(
          `${from}T00:00:00.000Z`,
        );
    }

    if (to) {
      createdAtFilter.$lte =
        new Date(
          `${to}T23:59:59.999Z`,
        );
    }

    filter.createdAt =
      createdAtFilter;
  }

  const skip =
    (
      page -
      1
    ) *
    limit;

  const [
    logs,
    total,
  ] = await Promise.all([
    AuditLogModel
      .find(filter)
      .sort({
        createdAt:
          -1,
      })
      .skip(skip)
      .limit(limit),

    AuditLogModel
      .countDocuments(
        filter,
      ),
  ]);

  response
    .status(200)
    .json({
      logs:
        logs.map(
          (log) =>
            serializeAuditLog(
              log,
            ),
        ),

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total /
              limit,
          ),
      },
    });
}