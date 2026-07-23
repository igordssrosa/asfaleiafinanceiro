import {
    Fragment,
    useCallback,
    useEffect,
    useState,
    type FormEvent,
} from "react";

import {
    ApiError,
} from "../api/api";

import {
    listAuditLogsRequest,
} from "../api/auditLogs";

import {
    HeaderAccount,
} from "../components/HeaderAccount";

import type {
    AuditLog,
    AuditLogAction,
    AuditLogResource,
    AuditLogPagination,
} from "../types/auditLog";

type AuditLogFilterState = {
    search: string;

    action:
    | ""
    | AuditLogAction;

    resource:
    | ""
    | AuditLogResource;

    from: string;
    to: string;
};

type LoadLogsOptions = {
    silent?: boolean;
};

const initialFilters:
    AuditLogFilterState = {
    search:
        "",

    action:
        "",

    resource:
        "",

    from:
        "",

    to:
        "",
};

const initialPagination:
    AuditLogPagination = {
    page:
        1,

    limit:
        20,

    total:
        0,

    totalPages:
        0,
};


function actionLabel(
  action: AuditLogAction,
): string {
  const labels: Record<
    AuditLogAction,
    string
  > = {
    create: "Criação",
    update: "Atualização",
    move_to_trash: "Envio para lixeira",
    restore: "Restauração",
    permanent_delete: "Exclusão definitiva",
    login: "Login",
    logout: "Logout",
  };

  return labels[action];
}

function resourceLabel(
  resource: AuditLogResource,
): string {
  const labels: Record<
    AuditLogResource,
    string
  > = {
    transaction: "Movimentação",
    product: "Produto",
    pricing_calculation: "Precificação",
    authentication: "Autenticação",
  };

  return labels[resource];
}

function formatDateTime(
    value: string,
): string {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            dateStyle:
                "short",

            timeStyle:
                "medium",
        },
    ).format(date);
}

function formatRefreshTime(
    value: Date | null,
): string {
    if (!value) {
        return "Ainda não atualizado";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            timeStyle:
                "medium",
        },
    ).format(value);
}

function hasMetadata(
    log: AuditLog,
): boolean {
    return (
        Object.keys(
            log.metadata,
        ).length > 0
    );
}

function getErrorMessage(
    error: unknown,
): string {
    if (
        error instanceof ApiError
    ) {
        return error.message;
    }

    return "Não foi possível carregar os registros de atividades.";
}

export function AuditLogsPage() {
    const [
        filterForm,
        setFilterForm,
    ] =
        useState<AuditLogFilterState>({
            ...initialFilters,
        });

    const [
        appliedFilters,
        setAppliedFilters,
    ] =
        useState<AuditLogFilterState>({
            ...initialFilters,
        });

    const [
        logs,
        setLogs,
    ] =
        useState<AuditLog[]>([]);

    const [
        pagination,
        setPagination,
    ] =
        useState<AuditLogPagination>(
            initialPagination,
        );

    const [
        page,
        setPage,
    ] =
        useState(1);

    const [
        isLoading,
        setIsLoading,
    ] =
        useState(true);

    const [
        isRefreshing,
        setIsRefreshing,
    ] =
        useState(false);

    const [
        errorMessage,
        setErrorMessage,
    ] =
        useState("");

    const [
        expandedLogId,
        setExpandedLogId,
    ] =
        useState<string | null>(
            null,
        );

    const [
        lastUpdatedAt,
        setLastUpdatedAt,
    ] =
        useState<Date | null>(
            null,
        );

    const loadLogs =
        useCallback(
            async (
                options:
                    LoadLogsOptions = {},
            ): Promise<void> => {
                const silent =
                    options.silent ??
                    false;

                if (silent) {
                    setIsRefreshing(true);
                } else {
                    setIsLoading(true);
                }

                try {
                    const response =
                        await listAuditLogsRequest({
                            search:
                                appliedFilters.search ||
                                undefined,

                            action:
                                appliedFilters.action ||
                                undefined,

                            resource:
                                appliedFilters.resource ||
                                undefined,

                            from:
                                appliedFilters.from ||
                                undefined,

                            to:
                                appliedFilters.to ||
                                undefined,

                            page,

                            limit:
                                20,
                        });

                    setLogs(
                        response.logs,
                    );

                    setPagination(
                        response.pagination,
                    );

                    setLastUpdatedAt(
                        new Date(),
                    );

                    setErrorMessage("");
                } catch (error) {
                    setErrorMessage(
                        getErrorMessage(
                            error,
                        ),
                    );
                } finally {
                    if (silent) {
                        setIsRefreshing(false);
                    } else {
                        setIsLoading(false);
                    }
                }
            },
            [
                appliedFilters,
                page,
            ],
        );

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        const interval =
            window.setInterval(
                () => {
                    if (
                        document.visibilityState !==
                        "visible"
                    ) {
                        return;
                    }

                    void loadLogs({
                        silent:
                            true,
                    });
                },
                5000,
            );

        return () => {
            window.clearInterval(
                interval,
            );
        };
    }, [loadLogs]);

    function updateFilter<
        Key extends
        keyof AuditLogFilterState,
    >(
        field: Key,
        value:
            AuditLogFilterState[Key],
    ): void {
        setFilterForm(
            (currentFilters) => ({
                ...currentFilters,

                [field]:
                    value,
            }),
        );
    }

    function handleApplyFilters(
        event:
            FormEvent<HTMLFormElement>,
    ): void {
        event.preventDefault();

        if (
            filterForm.from &&
            filterForm.to &&
            filterForm.from >
            filterForm.to
        ) {
            setErrorMessage(
                "A data inicial não pode ser posterior à data final.",
            );

            return;
        }

        setErrorMessage("");
        setExpandedLogId(null);
        setPage(1);

        setAppliedFilters({
            ...filterForm,

            search:
                filterForm.search.trim(),
        });
    }

    function handleClearFilters(): void {
        setFilterForm({
            ...initialFilters,
        });

        setAppliedFilters({
            ...initialFilters,
        });

        setPage(1);
        setExpandedLogId(null);
        setErrorMessage("");
    }

    function handlePreviousPage(): void {
        setPage(
            (currentPage) =>
                Math.max(
                    1,
                    currentPage - 1,
                ),
        );

        setExpandedLogId(null);

        window.scrollTo({
            top:
                0,

            behavior:
                "smooth",
        });
    }

    function handleNextPage(): void {
        setPage(
            (currentPage) =>
                Math.min(
                    pagination.totalPages,
                    currentPage + 1,
                ),
        );

        setExpandedLogId(null);

        window.scrollTo({
            top:
                0,

            behavior:
                "smooth",
        });
    }

    function toggleLogDetails(
        logId: string,
    ): void {
        setExpandedLogId(
            (currentId) =>
                currentId === logId
                    ? null
                    : logId,
        );
    }

    return (
        <>
            <header className="dashboard-header">
                <div>
                    <p className="eyebrow">
                        Auditoria
                    </p>

                    <h1>
                        Atividades
                    </h1>

                    <p className="muted-text">
                        Histórico das ações realizadas
                        no sistema.
                    </p>
                </div>

                <HeaderAccount />
            </header>

            <section className="empty-section audit-filters-section">
                <div className="section-heading">
                    <div>
                        <h2>
                            Filtrar atividades
                        </h2>

                        <p>
                            Pesquise por usuário, e-mail,
                            descrição ou identificador.
                        </p>
                    </div>

                    <div className="audit-live-status">
                        <span
                            className={`audit-live-dot ${isRefreshing
                                ? "audit-live-dot-refreshing"
                                : ""
                                }`}
                        />

                        <span>
                            {isRefreshing
                                ? "Atualizando..."
                                : `Atualizado às ${formatRefreshTime(
                                    lastUpdatedAt,
                                )}`}
                        </span>
                    </div>
                </div>

                <form
                    className="audit-filter-form"
                    onSubmit={
                        handleApplyFilters
                    }
                >
                    <label className="form-field audit-search-field">
                        <span>
                            Pesquisa
                        </span>

                        <input
                            type="search"
                            value={
                                filterForm.search
                            }
                            onChange={(event) =>
                                updateFilter(
                                    "search",
                                    event.target.value,
                                )
                            }
                            placeholder="Ex.: camiseta, Igor ou ID do registro"
                            maxLength={120}
                        />
                    </label>

                    <label className="form-field">
                        <span>
                            Módulo
                        </span>

                        <select
                            value={
                                filterForm.resource
                            }
                            onChange={(event) =>
                                updateFilter(
                                    "resource",
                                    event.target
                                        .value as
                                    AuditLogFilterState["resource"],
                                )
                            }
                        >
                            <option value="">
                                Todos
                            </option>

                            <option value="transaction">
                                Movimentações
                            </option>

                            <option value="product">
                                Produtos
                            </option>

                            <option value="authentication">
                                Autenticação
                            </option>
                        </select>
                    </label>

                    <label className="form-field">
                        <span>
                            Ação
                        </span>

                        <select
                            value={
                                filterForm.action
                            }
                            onChange={(event) =>
                                updateFilter(
                                    "action",
                                    event.target
                                        .value as
                                    AuditLogFilterState["action"],
                                )
                            }
                        >
                            <option value="">
                                Todas
                            </option>

                            <option value="create">
                                Criação
                            </option>

                            <option value="update">
                                Atualização
                            </option>

                            <option value="move_to_trash">
                                Envio para lixeira
                            </option>

                            <option value="restore">
                                Restauração
                            </option>

                            <option value="login">
                                Login
                            </option>

                            <option value="logout">
                                Logout
                            </option>
                        </select>
                    </label>

                    <label className="form-field">
                        <span>
                            Data inicial
                        </span>

                        <input
                            type="date"
                            value={
                                filterForm.from
                            }
                            onChange={(event) =>
                                updateFilter(
                                    "from",
                                    event.target.value,
                                )
                            }
                        />
                    </label>

                    <label className="form-field">
                        <span>
                            Data final
                        </span>

                        <input
                            type="date"
                            value={
                                filterForm.to
                            }
                            onChange={(event) =>
                                updateFilter(
                                    "to",
                                    event.target.value,
                                )
                            }
                        />
                    </label>

                    <div className="audit-filter-actions">
                        <button
                            type="submit"
                            className="primary-button"
                            disabled={
                                isLoading
                            }
                        >
                            Aplicar filtros
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                handleClearFilters
                            }
                            disabled={
                                isLoading
                            }
                        >
                            Limpar
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                                void loadLogs({
                                    silent:
                                        true,
                                })
                            }
                            disabled={
                                isLoading ||
                                isRefreshing
                            }
                        >
                            {isRefreshing
                                ? "Atualizando..."
                                : "Atualizar agora"}
                        </button>
                    </div>
                </form>
            </section>

            {errorMessage && (
                <div
                    className="error-message"
                    role="alert"
                >
                    {errorMessage}
                </div>
            )}

            <section className="empty-section audit-list-section">
                <div className="section-heading">
                    <div>
                        <h2>
                            Histórico
                        </h2>

                        <p>
                            {pagination.total}{" "}
                            {pagination.total === 1
                                ? "atividade encontrada"
                                : "atividades encontradas"}
                            .
                        </p>
                    </div>
                </div>

                {isLoading ? (
                    <p className="muted-text">
                        Carregando atividades...
                    </p>
                ) : logs.length === 0 ? (
                    <div className="trash-empty-state">
                        <h3>
                            Nenhuma atividade encontrada
                        </h3>

                        <p>
                            Os registros aparecerão aqui
                            quando alguma ação for realizada
                            no sistema.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table className="data-table audit-log-table">
                                <thead>
                                    <tr>
                                        <th>
                                            Data e hora
                                        </th>

                                        <th>
                                            Usuário
                                        </th>

                                        <th>
                                            Módulo
                                        </th>

                                        <th>
                                            Ação
                                        </th>

                                        <th>
                                            Descrição
                                        </th>

                                        <th>
                                            Detalhes
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {logs.map((log) => {
                                        const isExpanded =
                                            expandedLogId === log.id;

                                        return (
                                            <Fragment key={log.id}>
                                                <tr>
                                                    <td className="audit-date-cell">
                                                        {formatDateTime(
                                                            log.createdAt,
                                                        )}
                                                    </td>

                                                    <td>
                                                        <div className="audit-user-cell">
                                                            <strong>
                                                                {log.actor.name}
                                                            </strong>

                                                            <span>
                                                                {log.actor.email}
                                                            </span>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        <span className="audit-resource-badge">
                                                            {resourceLabel(
                                                                log.resource,
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={`audit-action-badge audit-action-${log.action}`}
                                                        >
                                                            {actionLabel(
                                                                log.action,
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="audit-description-cell">
                                                        {log.description}
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="table-button"
                                                            onClick={() =>
                                                                toggleLogDetails(
                                                                    log.id,
                                                                )
                                                            }
                                                        >
                                                            {isExpanded
                                                                ? "Ocultar"
                                                                : "Ver detalhes"}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {isExpanded && (
                                                    <tr className="audit-details-row">
                                                        <td colSpan={6}>
                                                            <div className="audit-details-panel">
                                                                <div className="audit-details-grid">
                                                                    <div>
                                                                        <span>
                                                                            ID do log
                                                                        </span>

                                                                        <strong>
                                                                            {log.id}
                                                                        </strong>
                                                                    </div>

                                                                    <div>
                                                                        <span>
                                                                            ID do item
                                                                        </span>

                                                                        <strong>
                                                                            {log.resourceId}
                                                                        </strong>
                                                                    </div>

                                                                    <div>
                                                                        <span>
                                                                            ID do usuário
                                                                        </span>

                                                                        <strong>
                                                                            {log.actor.id}
                                                                        </strong>
                                                                    </div>

                                                                    <div>
                                                                        <span>
                                                                            Endereço IP
                                                                        </span>

                                                                        <strong>
                                                                            {log.ipAddress ?? "-"}
                                                                        </strong>
                                                                    </div>
                                                                </div>

                                                                <div className="audit-details-block">
                                                                    <span>
                                                                        Navegador e dispositivo
                                                                    </span>

                                                                    <p>
                                                                        {log.userAgent ?? "-"}
                                                                    </p>
                                                                </div>

                                                                <div className="audit-details-block">
                                                                    <span>
                                                                        Informações da ação
                                                                    </span>

                                                                    {hasMetadata(log) ? (
                                                                        <pre>
                                                                            {JSON.stringify(
                                                                                log.metadata,
                                                                                null,
                                                                                2,
                                                                            )}
                                                                        </pre>
                                                                    ) : (
                                                                        <p>
                                                                            Nenhuma informação adicional.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="audit-pagination">
                            <button
                                type="button"
                                className="secondary-button"
                                onClick={
                                    handlePreviousPage
                                }
                                disabled={
                                    page <= 1 ||
                                    isLoading
                                }
                            >
                                Anterior
                            </button>

                            <span>
                                Página {pagination.page} de{" "}
                                {Math.max(
                                    pagination.totalPages,
                                    1,
                                )}
                            </span>

                            <button
                                type="button"
                                className="secondary-button"
                                onClick={
                                    handleNextPage
                                }
                                disabled={
                                    page >=
                                    pagination.totalPages ||
                                    pagination.totalPages === 0 ||
                                    isLoading
                                }
                            >
                                Próxima
                            </button>
                        </div>
                    </>
                )}
            </section>
        </>
    );
}