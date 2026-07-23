import {
  NavLink,
  Outlet,
} from "react-router-dom";

function getNavigationClass({
  isActive,
}: {
  isActive: boolean;
}): string | undefined {
  return isActive
    ? "active-navigation"
    : undefined;
}

export function AppLayout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">
            Asfaleia
          </p>

          <h2>
            Financeiro
          </h2>
        </div>

        <nav aria-label="Menu principal">
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

          <NavLink
            to="/lixeira"
            className={
              getNavigationClass
            }
          >
            Lixeira
          </NavLink>
        </nav>
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}