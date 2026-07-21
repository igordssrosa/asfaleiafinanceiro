export type ProductStatus =
  | "active"
  | "inactive";

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  description: string | null;
  unitCost: number;
  salePrice: number;
  status: ProductStatus;
  notes: string | null;
  createdBy: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  name: string;
  sku?: string | null;
  category: string;
  description?: string | null;
  unitCost: number;
  salePrice: number;
  status: ProductStatus;
  notes?: string | null;
};

export type ProductResponse = {
  message: string;
  product: Product;
};

export type ProductMessageResponse = {
  message: string;
};

export type ListProductsResponse = {
  products: Product[];

  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ListProductsParams = {
  search?: string;
  category?: string;
  status?: ProductStatus;
  page?: number;
  limit?: number;
};