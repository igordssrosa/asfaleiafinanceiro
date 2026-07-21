const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error(
    "A variável VITE_API_URL não foi definida no frontend/.env",
  );
}

type ApiErrorBody = {
  message?: string;
  errors?: Record<string, string[] | undefined>;
};

type ApiFetchOptions = RequestInit & {
  retryOnUnauthorized?: boolean;
};

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[] | undefined>;

  constructor(
    message: string,
    status: number,
    errors?: Record<string, string[] | undefined>,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function parseResponseBody(
  response: Response,
): Promise<unknown> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return null;
  }

  return response.json();
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    retryOnUnauthorized = true,
    headers,
    ...requestOptions
  } = options;

  const executeRequest = async (): Promise<Response> => {
    return fetch(`${apiUrl}${path}`, {
      ...requestOptions,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
  };

  let response = await executeRequest();

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();

    if (refreshed) {
      response = await executeRequest();
    }
  }

  const body = (await parseResponseBody(
    response,
  )) as ApiErrorBody | T | null;

  if (!response.ok) {
    const errorBody = body as ApiErrorBody | null;

    throw new ApiError(
      errorBody?.message ?? "Não foi possível concluir a operação.",
      response.status,
      errorBody?.errors,
    );
  }

  return body as T;
}