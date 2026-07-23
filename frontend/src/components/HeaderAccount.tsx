import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../contexts/AuthContext";

import {
  ThemeToggle,
} from "./ThemeToggle";

type HeaderAccountProps = {
  children?: ReactNode;
};

const PROFILE_IMAGE_STORAGE_PREFIX =
  "asfaleia_profile_image_";

const MAX_PROFILE_IMAGE_SIZE =
  5 * 1024 * 1024;

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

function getProfileImageStorageKey(
  userId: string,
): string {
  return (
    PROFILE_IMAGE_STORAGE_PREFIX +
    userId
  );
}

function resizeProfileImage(
  file: File,
): Promise<string> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const reader =
        new FileReader();

      reader.onerror =
        () => {
          reject(
            new Error(
              "Não foi possível ler a imagem.",
            ),
          );
        };

      reader.onload =
        () => {
          if (
            typeof reader.result !==
            "string"
          ) {
            reject(
              new Error(
                "Arquivo de imagem inválido.",
              ),
            );

            return;
          }

          const image =
            new Image();

          image.onerror =
            () => {
              reject(
                new Error(
                  "Não foi possível carregar a imagem.",
                ),
              );
            };

          image.onload =
            () => {
              const outputSize =
                256;

              const canvas =
                document.createElement(
                  "canvas",
                );

              canvas.width =
                outputSize;

              canvas.height =
                outputSize;

              const context =
                canvas.getContext(
                  "2d",
                );

              if (!context) {
                reject(
                  new Error(
                    "Não foi possível processar a imagem.",
                  ),
                );

                return;
              }

              const smallestSide =
                Math.min(
                  image.width,
                  image.height,
                );

              const sourceX =
                (
                  image.width -
                  smallestSide
                ) / 2;

              const sourceY =
                (
                  image.height -
                  smallestSide
                ) / 2;

              context.drawImage(
                image,
                sourceX,
                sourceY,
                smallestSide,
                smallestSide,
                0,
                0,
                outputSize,
                outputSize,
              );

              const resizedImage =
                canvas.toDataURL(
                  "image/jpeg",
                  0.86,
                );

              resolve(
                resizedImage,
              );
            };

          image.src =
            reader.result;
        };

      reader.readAsDataURL(
        file,
      );
    },
  );
}

export function HeaderAccount({
  children,
}: HeaderAccountProps) {
  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  const profileContainerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    isMenuOpen,
    setIsMenuOpen,
  ] =
    useState(false);

  const [
    profileImage,
    setProfileImage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    imageError,
    setImageError,
  ] =
    useState("");

  const [
    isProcessingImage,
    setIsProcessingImage,
  ] =
    useState(false);

  useEffect(() => {
    if (!user?.id) {
      setProfileImage(
        null,
      );

      return;
    }

    const storedImage =
      window.localStorage.getItem(
        getProfileImageStorageKey(
          user.id,
        ),
      );

    setProfileImage(
      storedImage,
    );
  }, [user?.id]);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ): void {
      const target =
        event.target;

      if (
        !(target instanceof Node)
      ) {
        return;
      }

      if (
        profileContainerRef.current &&
        !profileContainerRef.current.contains(
          target,
        )
      ) {
        setIsMenuOpen(
          false,
        );
      }
    }

    function handleEscapeKey(
      event: KeyboardEvent,
    ): void {
      if (
        event.key ===
        "Escape"
      ) {
        setIsMenuOpen(
          false,
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    document.addEventListener(
      "keydown",
      handleEscapeKey,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );

      document.removeEventListener(
        "keydown",
        handleEscapeKey,
      );
    };
  }, []);

  async function handleProfileImageChange(
    event:
      ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (
      !file ||
      !user?.id
    ) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/",
      )
    ) {
      setImageError(
        "Selecione um arquivo de imagem válido.",
      );

      return;
    }

    if (
      file.size >
      MAX_PROFILE_IMAGE_SIZE
    ) {
      setImageError(
        "A imagem deve possuir no máximo 5 MB.",
      );

      return;
    }

    setIsProcessingImage(
      true,
    );

    setImageError("");

    try {
      const resizedImage =
        await resizeProfileImage(
          file,
        );

      window.localStorage.setItem(
        getProfileImageStorageKey(
          user.id,
        ),
        resizedImage,
      );

      setProfileImage(
        resizedImage,
      );
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a foto.",
      );
    } finally {
      setIsProcessingImage(
        false,
      );
    }
  }

  function handleRemoveProfileImage(): void {
    if (!user?.id) {
      return;
    }

    window.localStorage.removeItem(
      getProfileImageStorageKey(
        user.id,
      ),
    );

    setProfileImage(
      null,
    );

    setImageError("");
  }

  async function handleLogout(): Promise<void> {
    setIsMenuOpen(
      false,
    );

    await logout();

    navigate(
      "/login",
      {
        replace:
          true,
      },
    );
  }

  return (
    <div className="header-tools">
      <div className="header-account-row">
        <ThemeToggle />

        <div
          className="header-profile"
          ref={
            profileContainerRef
          }
        >
          <button
            type="button"
            className="header-account-card header-account-trigger"
            onClick={() =>
              setIsMenuOpen(
                (currentValue) =>
                  !currentValue,
              )
            }
            aria-haspopup="menu"
            aria-expanded={
              isMenuOpen
            }
          >
            <div
              className="header-account-avatar"
              aria-hidden="true"
            >
              {profileImage ? (
                <img
                  src={
                    profileImage
                  }
                  alt=""
                />
              ) : (
                getInitials(
                  user?.name,
                )
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

            <svg
              className="header-account-chevron"
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d={
                  isMenuOpen
                    ? "m18 15-6-6-6 6"
                    : "m6 9 6 6 6-6"
                }
              />
            </svg>
          </button>

          {isMenuOpen && (
            <div
              className="profile-menu"
              role="menu"
            >
              <div className="profile-menu-header">
                <div className="profile-menu-avatar">
                  {profileImage ? (
                    <img
                      src={
                        profileImage
                      }
                      alt=""
                    />
                  ) : (
                    getInitials(
                      user?.name,
                    )
                  )}
                </div>

                <div className="profile-menu-user">
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

              <div className="profile-menu-divider" />

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="profile-image-input"
                onChange={
                  handleProfileImageChange
                }
              />

              <button
                type="button"
                className="profile-menu-action"
                role="menuitem"
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={
                  isProcessingImage
                }
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4h-5L7.8 6H5a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-2.8Z" />

                  <circle
                    cx="12"
                    cy="13"
                    r="3"
                  />
                </svg>

                <span>
                  {isProcessingImage
                    ? "Processando..."
                    : profileImage
                      ? "Trocar foto"
                      : "Adicionar foto"}
                </span>
              </button>

              {profileImage && (
                <button
                  type="button"
                  className="profile-menu-action"
                  role="menuitem"
                  onClick={
                    handleRemoveProfileImage
                  }
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="19"
                    height="19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>

                  <span>
                    Remover foto
                  </span>
                </button>
              )}

              {imageError && (
                <p
                  className="profile-menu-error"
                  role="alert"
                >
                  {imageError}
                </p>
              )}

              <div className="profile-menu-divider" />

              <button
                type="button"
                className="profile-menu-action profile-menu-logout"
                role="menuitem"
                onClick={() =>
                  void handleLogout()
                }
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="19"
                  height="19"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10 17l5-5-5-5" />
                  <path d="M15 12H3" />
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                </svg>

                <span>
                  Sair do sistema
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}