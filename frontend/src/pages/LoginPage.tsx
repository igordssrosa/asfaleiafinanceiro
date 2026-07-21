import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { ApiError } from "../api/api";
import { useAuth } from "../contexts/AuthContext";

type LocationState = {
  from?: string;
};

export function LoginPage() {
  const {
    login,
    status,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  useEffect(() => {
    setErrorMessage("");
  }, [email, password]);

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  const locationState =
    location.state as LocationState | null;

  const destination =
    locationState?.from ?? "/dashboard";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await login({
        email,
        password,
      });

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "Não foi possível acessar o sistema.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-heading">
          <span className="brand-mark">A</span>

          <div>
            <p className="eyebrow">Asfaleia</p>
            <h1>Sistema financeiro</h1>
            <p className="muted-text">
              Acesso exclusivo dos proprietários.
            </p>
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <label htmlFor="email">
            E-mail
          </label>

          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            autoComplete="email"
            placeholder="nome@useasfaleia.com"
            required
            maxLength={160}
            disabled={isSubmitting}
          />

          <label htmlFor="password">
            Senha
          </label>

          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="current-password"
            placeholder="Digite sua senha"
            required
            maxLength={200}
            disabled={isSubmitting}
          />

          {errorMessage && (
            <div
              className="error-message"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Entrando..."
              : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}