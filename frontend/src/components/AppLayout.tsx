import {
  NavLink,
  Outlet,
} from "react-router-dom";

function getNavigationClass({
  isActive,
}: {
  isActive:
    boolean;
}): string {
  return isActive
    ? "sidebar-nav-link active-navigation"
    : "sidebar-nav-link";
}

export function AppLayout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <p className="eyebrow">
            Asfaleia
          </p>

          <h2>
            Financeiro
          </h2>
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Menu principal"
        >
          <section
            className="sidebar-nav-group"
            aria-labelledby="sidebar-group-main"
          >
            <p
              id="sidebar-group-main"
              className="sidebar-nav-label"
            >
              Principal
            </p>

            <div className="sidebar-nav-links">
              <NavLink
                to="/dashboard"
                className={
                  getNavigationClass
                }
              >
                Visão geral
              </NavLink>

              <NavLink
                to="/movimentacoes"
                className={
                  getNavigationClass
                }
              >
                Movimentações
              </NavLink>
            </div>
          </section>

          <section
            className="sidebar-nav-group"
            aria-labelledby="sidebar-group-operation"
          >
            <p
              id="sidebar-group-operation"
              className="sidebar-nav-label"
            >
              Operação
            </p>

            <div className="sidebar-nav-links">
              <NavLink
                to="/produtos"
                className={
                  getNavigationClass
                }
              >
                Produtos
              </NavLink>

              <NavLink
                to="/estoque"
                className={
                  getNavigationClass
                }
              >
                Estoque
              </NavLink>
            </div>
          </section>

          <section
            className="sidebar-nav-group"
            aria-labelledby="sidebar-group-control"
          >
            <p
              id="sidebar-group-control"
              className="sidebar-nav-label"
            >
              Análise e controle
            </p>

            <div className="sidebar-nav-links">
              <NavLink
                to="/calculadoras"
                className={
                  getNavigationClass
                }
              >
                Calculadoras
              </NavLink>

              <NavLink
                to="/relatorios"
                className={
                  getNavigationClass
                }
              >
                Relatórios
              </NavLink>

              <NavLink
                to="/atividades"
                className={
                  getNavigationClass
                }
              >
                Atividades
              </NavLink>
            </div>
          </section>

          <section
            className="sidebar-nav-group sidebar-nav-group-system"
            aria-labelledby="sidebar-group-system"
          >
            <p
              id="sidebar-group-system"
              className="sidebar-nav-label"
            >
              Sistema
            </p>

            <div className="sidebar-nav-links">
              <NavLink
                to="/lixeira"
                className={({
                  isActive,
                }) =>
                  [
                    getNavigationClass({
                      isActive,
                    }),
                    "sidebar-trash-link",
                  ].join(" ")
                }
              >
                Lixeira
              </NavLink>
            </div>
          </section>
        </nav>
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}