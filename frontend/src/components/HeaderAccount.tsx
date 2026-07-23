import type {
  ReactNode,
} from "react";

import {
  useAuth,
} from "../contexts/AuthContext";

import {
  ThemeToggle,
} from "./ThemeToggle";

type HeaderAccountProps = {
  children?: ReactNode;
};

function getInitials(
  name: string | undefined,
): string {
  if (!name) {
    return "A";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part
        .charAt(0)
        .toUpperCase(),
    )
    .join("");
}

export function HeaderAccount({
  children,
}: HeaderAccountProps) {
  const {
    user,
  } = useAuth();

  return (
    <div className="header-tools">
      <div className="header-account-row">
        <ThemeToggle />

        <div className="header-account-card">
          <div
            className="header-account-avatar"
            aria-hidden="true"
          >
            {getInitials(
              user?.name,
            )}
          </div>

          <div className="header-account-details">
            <strong>
              {user?.name ??
                "Usuário"}
            </strong>

            <span>
              {user?.email ??
                ""}
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}