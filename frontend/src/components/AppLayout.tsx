import {
  NavLink,
  Outlet,
} from "react-router-dom";

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
            className={({
              isActive,
            }) =>
              isActive
                ? "active-navigation"
                : undefined
            }
          >
            Visão geral
          </NavLink>

          <NavLink
            to="/movimentacoes"
            className={({
              isActive,
            }) =>
              isActive
                ? "active-navigation"
                : undefined
            }
          >
            Movimentações
          </NavLink>

          <NavLink
            to="/produtos"
            className={({
              isActive,
            }) =>
              isActive
                ? "active-navigation"
                : undefined
            }
          >
            Produtos
          </NavLink>

          <NavLink
            to="/calculadoras"
            className={({
              isActive,
            }) =>
              isActive
                ? "active-navigation"
                : undefined
            }
          >
            Calculadoras
          </NavLink>

          <NavLink
            to="/relatorios"
            className={({
              isActive,
            }) =>
              isActive
                ? "active-navigation"
                : undefined
            }
          >
            Relatórios
          </NavLink>

          <NavLink
            to="/atividades"
            className={({
              isActive,
            }) =>
              isActive
                ? "active-navigation"
                : undefined
            }
          >
            Atividades
          </NavLink>

          <NavLink
            to="/lixeira"
            className={({
              isActive,
            }) =>
              isActive
                ? "active-navigation"
                : undefined
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