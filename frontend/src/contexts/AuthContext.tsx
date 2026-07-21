import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
} from "../api/auth";
import { ApiError } from "../api/api";
import type {
  LoginInput,
  Owner,
} from "../types/auth";

type AuthenticationStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated";

type AuthContextValue = {
  user: Owner | null;
  status: AuthenticationStatus;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(
  null,
);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [user, setUser] = useState<Owner | null>(null);

  const [status, setStatus] =
    useState<AuthenticationStatus>("loading");

  useEffect(() => {
    let componentIsMounted = true;

    async function loadCurrentUser(): Promise<void> {
      try {
        const response =
          await getCurrentUserRequest();

        if (!componentIsMounted) {
          return;
        }

        setUser(response.user);
        setStatus("authenticated");
      } catch {
        if (!componentIsMounted) {
          return;
        }

        setUser(null);
        setStatus("unauthenticated");
      }
    }

    void loadCurrentUser();

    return () => {
      componentIsMounted = false;
    };
  }, []);

  async function login(
    credentials: LoginInput,
  ): Promise<void> {
    try {
      const response = await loginRequest(credentials);

      setUser(response.user);
      setStatus("authenticated");
    } catch (error) {
      setUser(null);
      setStatus("unauthenticated");

      if (error instanceof ApiError) {
        throw error;
      }

      throw new Error(
        "Não foi possível acessar o sistema.",
      );
    }
  }

  async function logout(): Promise<void> {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      logout,
    }),
    [user, status],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth deve ser utilizado dentro do AuthProvider.",
    );
  }

  return context;
}