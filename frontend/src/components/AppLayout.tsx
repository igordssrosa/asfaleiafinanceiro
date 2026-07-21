import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

export function AppLayout() {
  const {
    user,
    logout,
  } = useAuth();

  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();

    navigate("/login", {
      replace: true,
    });
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">
            Asfaleia
          </p>

          <h2>Financeiro</h2>
        </div>

        <nav aria-label="Menu principal">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              isActive
                ? "active-navigation"
                : undefined
            }
          >
            Visão geral
          </NavLink>

          <NavLink
            to="/movimentacoes"
            className={({ isActive }) =>
              isActive
                ? "active-navigation"
                : undefined
            }
          >
            Movimentações
          </NavLink>

          <span>Produtos</span>
          <span>Calculadoras</span>
          <span>Relatórios</span>
        </nav>

        <div className="sidebar-user">
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={handleLogout}
        >
          Sair
        </button>
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}