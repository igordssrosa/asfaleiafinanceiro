import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
} from "../api/auth";

import {
  ApiError,
} from "../api/api";

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
  login: (
    credentials: LoginInput,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

type AuthProviderProps = {
  children: ReactNode;
};

function parseExpirationTime(
  value: string,
): number | null {
  const expirationTime =
    new Date(value).getTime();

  if (
    !Number.isFinite(
      expirationTime,
    )
  ) {
    return null;
  }

  return expirationTime;
}

export function AuthProvider({
  children,
}: AuthProviderProps) {
  const [
    user,
    setUser,
  ] =
    useState<Owner | null>(
      null,
    );

  const [
    status,
    setStatus,
  ] =
    useState<AuthenticationStatus>(
      "loading",
    );

  const [
    sessionExpiresAt,
    setSessionExpiresAt,
  ] =
    useState<string | null>(
      null,
    );

  const isLoggingOutRef =
    useRef(false);

  const clearAuthentication =
    useCallback((): void => {
      setUser(null);

      setSessionExpiresAt(
        null,
      );

      setStatus(
        "unauthenticated",
      );
    }, []);

  const logout =
    useCallback(
      async (): Promise<void> => {
        if (
          isLoggingOutRef.current
        ) {
          return;
        }

        isLoggingOutRef.current =
          true;

        try {
          await logoutRequest();
        } catch {
          /*
           * Mesmo que o backend esteja
           * indisponível, o frontend deve
           * encerrar a sessão localmente.
           */
        } finally {
          clearAuthentication();

          isLoggingOutRef.current =
            false;
        }
      },
      [
        clearAuthentication,
      ],
    );

  useEffect(() => {
    let componentIsMounted =
      true;

    async function loadCurrentUser(): Promise<void> {
      try {
        const response =
          await getCurrentUserRequest();

        if (
          !componentIsMounted
        ) {
          return;
        }

        const expirationTime =
          parseExpirationTime(
            response.sessionExpiresAt,
          );

        if (
          expirationTime ===
          null ||
          expirationTime <=
          Date.now()
        ) {
          clearAuthentication();

          return;
        }

        setUser(
          response.user,
        );

        setSessionExpiresAt(
          response.sessionExpiresAt,
        );

        setStatus(
          "authenticated",
        );
      } catch {
        if (
          !componentIsMounted
        ) {
          return;
        }

        clearAuthentication();
      }
    }

    void loadCurrentUser();

    return () => {
      componentIsMounted =
        false;
    };
  }, [clearAuthentication]);

  async function login(
    credentials:
      LoginInput,
  ): Promise<void> {
    try {
      const response =
        await loginRequest(
          credentials,
        );

      const expirationTime =
        parseExpirationTime(
          response.sessionExpiresAt,
        );

      if (
        expirationTime === null ||
        expirationTime <=
        Date.now()
      ) {
        clearAuthentication();

        throw new Error(
          "A sessão recebida já está expirada.",
        );
      }

      setUser(
        response.user,
      );

      setSessionExpiresAt(
        response.sessionExpiresAt,
      );

      setStatus(
        "authenticated",
      );
    } catch (error) {
      clearAuthentication();

      if (
        error instanceof
        ApiError
      ) {
        throw error;
      }

      throw new Error(
        "Não foi possível acessar o sistema.",
      );
    }
  }

  /*
   * Agenda o logout para o horário exato
   * retornado pelo backend.
   */
  useEffect(() => {
    if (
      status !== "authenticated" ||
      !sessionExpiresAt
    ) {
      return;
    }

    const parsedExpirationTime =
      parseExpirationTime(
        sessionExpiresAt,
      );

    if (
      parsedExpirationTime === null
    ) {
      void logout();

      return;
    }

    /*
     * Depois da validação, criamos uma
     * constante que obrigatoriamente é number.
     */
    const expirationTime:
      number =
      parsedExpirationTime;

    function checkSessionExpiration(): void {
      if (
        Date.now() >=
        expirationTime
      ) {
        void logout();
      }
    }

    const remainingTime =
      expirationTime -
      Date.now();

    if (
      remainingTime <= 0
    ) {
      void logout();

      return;
    }

    const timerId =
      window.setTimeout(
        checkSessionExpiration,
        remainingTime,
      );

    function handleVisibilityChange(): void {
      if (
        document.visibilityState ===
        "visible"
      ) {
        checkSessionExpiration();
      }
    }

    window.addEventListener(
      "focus",
      checkSessionExpiration,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.clearTimeout(
        timerId,
      );

      window.removeEventListener(
        "focus",
        checkSessionExpiration,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [
    logout,
    sessionExpiresAt,
    status,
  ]);

  const contextValue =
    useMemo<AuthContextValue>(
      () => ({
        user,
        status,
        login,
        logout,
      }),
      [
        user,
        status,
        logout,
      ],
    );

  return (
    <AuthContext.Provider
      value={
        contextValue
      }
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context =
    useContext(
      AuthContext,
    );

  if (!context) {
    throw new Error(
      "useAuth deve ser utilizado dentro do AuthProvider.",
    );
  }

  return context;
}