export type Owner = {
  id: string;
  name: string;
  email: string;
  role: "owner";
  lastLoginAt?: string | null;
  createdAt?: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  user: Owner;
};

export type CurrentUserResponse = {
  user: Owner;
};

export type MessageResponse = {
  message: string;
};