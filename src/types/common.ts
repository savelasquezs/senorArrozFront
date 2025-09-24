export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

// Order related types (matching your backend enums)
export const OrderStatus = {
  TAKEN: 'taken',
  IN_PREPARATION: 'in_preparation',
  READY: 'ready',
  ON_THE_WAY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
} as const

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus]

export const OrderType = {
  ONSITE: 'onsite',
  DELIVERY: 'delivery',
  RESERVATION: 'reservation'
} as const

export type OrderTypeType = typeof OrderType[keyof typeof OrderType]

// API envelope used by backend
export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// Branch domain
export interface BranchUserSummary {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  lastLogin: string;
}

export interface NeighborhoodSummary {
  id: number;
  branchId: number;
  name: string;
  deliveryFee: number;
  createdAt: string;
  updatedAt: string;
  totalCustomers: number;
  totalAddresses: number;
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone1: string;
  phone2: string;
  createdAt: string;
  updatedAt: string;
  totalUsers: number;
  totalCustomers: number;
  totalNeighborhoods: number;
  activeUsers: number;
  activeCustomers: number;
  neighborhoods: NeighborhoodSummary[];
  users: BranchUserSummary[];
}

export interface BranchFilters {
  Name?: string;
  Address?: string;
  Phone?: string;
  Page?: number;
  PageSize?: number;
  SortBy?: string;
  SortOrder?: string;
}
