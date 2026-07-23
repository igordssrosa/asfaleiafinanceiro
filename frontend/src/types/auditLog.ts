export type AuditLogAction =
  | "create"
  | "update"
  | "move_to_trash"
  | "restore"
  | "permanent_delete"
  | "login"
  | "logout";

export type AuditLogResource =
  | "transaction"
  | "product"
  | "pricing_calculation"
  | "authentication";

export type AuditLogActor = {
  id: string;
  name: string;
  email: string;
};

export type AuditLogMetadata =
  Record<
    string,
    unknown
  >;

export type AuditLog = {
  id: string;

  actor:
    AuditLogActor;

  action:
    AuditLogAction;

  resource:
    AuditLogResource;

  resourceId:
    string;

  description:
    string;

  metadata:
    AuditLogMetadata;

  ipAddress:
    string | null;

  userAgent:
    string | null;

  createdAt:
    string;
};

export type AuditLogPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListAuditLogsResponse = {
  logs:
    AuditLog[];

  pagination:
    AuditLogPagination;
};

export type ListAuditLogsParams = {
  action?:
    AuditLogAction;

  resource?:
    AuditLogResource;

  search?:
    string;

  from?:
    string;

  to?:
    string;

  page?:
    number;

  limit?:
    number;
};