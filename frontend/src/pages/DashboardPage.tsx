import {
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

export function DashboardPage() {
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
          <p className="eyebrow">Asfaleia</p>
          <h2>Financeiro</h2>
        </div>

        <nav aria-label="Menu principal">
          <a
            href="/dashboard"
            className="active-navigation"
          >
            Visão geral
          </a>

          <span>Movimentações</span>
          <span>Produtos</span>
          <span>Calculadoras</span>
          <span>Relatórios</span>
        </nav>

        <button
          className="secondary-button"
          type="button"
          onClick={handleLogout}
        >
          Sair
        </button>
      </aside>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">
              Painel financeiro
            </p>

            <h1>
              Olá, {user?.name}
            </h1>

            <p className="muted-text">
              Seu acesso está autenticado e protegido.
            </p>
          </div>

          <div className="user-badge">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
        </header>

        <section className="metrics-grid">
          <article className="metric-card">
            <span>Receitas do mês</span>
            <strong>R$ 0,00</strong>
            <small>Nenhuma receita cadastrada</small>
          </article>

          <article className="metric-card">
            <span>Despesas do mês</span>
            <strong>R$ 0,00</strong>
            <small>Nenhuma despesa cadastrada</small>
          </article>

          <article className="metric-card">
            <span>Resultado do mês</span>
            <strong>R$ 0,00</strong>
            <small>Receitas menos despesas</small>
          </article>

          <article className="metric-card">
            <span>Saldo acumulado</span>
            <strong>R$ 0,00</strong>
            <small>Saldo financeiro atual</small>
          </article>
        </section>

        <section className="empty-section">
          <h2>Movimentações recentes</h2>

          <p>
            As movimentações financeiras aparecerão
            aqui depois que criarmos o módulo de
            receitas e despesas.
          </p>
        </section>
      </main>
    </div>
  );
}