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
  