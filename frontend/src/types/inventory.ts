export type InventoryStatus =
  | "active"
  | "inactive";

export type InventoryProduct = {
  id: string;

  name: string;

  sku:
    string | null;

  category:
    string;

  status:
    InventoryStatus;

  unitCost:
    number;

  salePrice:
    number;
};

export type InventoryVariant = {
  id:
    string | null;

  color:
    string;

  size:
    string;

  quantity:
    number;

  minimumStock:
    number;

  isOutOfStock:
    boolean;

  isLowStock:
    boolean;
};

export type InventoryItem = {
  id:
    string;

  product:
    InventoryProduct;

  isActive:
    boolean;

  variants:
    InventoryVariant[];

  totalQuantity:
    number;

  variantCount:
    number;

  lowStockVariants:
    number;

  outOfStockVariants:
    number;

  createdAt:
    string;

  updatedAt:
    string;
};

export type InventorySummary = {
  totalProducts:
    number;

  activeProducts:
    number;

  inactiveProducts:
    number;

  totalUnits:
    number;

  lowStockVariants:
    number;

  outOfStockVariants:
    number;
};

export type InventoryPagination = {
  page:
    number;

  limit:
    number;

  total:
    number;

  totalPages:
    number;
};

export type ListInventoryResponse = {
  inventoryItems:
    InventoryItem[];

  summary:
    InventorySummary;

  pagination:
    InventoryPagination;
};

export type GetInventoryItemResponse = {
  inventoryItem:
    InventoryItem;
};

export type InventoryVariantInput = {
  color:
    string;

  size:
    string;

  quantity:
    number;

  minimumStock:
    number;
};

export type UpdateInventoryInput = {
  isActive?:
    boolean;

  variants?:
    InventoryVariantInput[];
};

export type UpdateInventoryResponse = {
  message:
    string;

  inventoryItem:
    InventoryItem;
};

export type ListInventoryParams = {
  search?:
    string;

  status?:
    InventoryStatus;

  page?:
    number;

  limit?:
    number;
};