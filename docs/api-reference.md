# Referencia de APIs - Señor Arroz

## 🌐 Configuración Base

### Base URL
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7049/api'
```

### Clase Base API
```typescript
class BaseApi {
  protected api: AxiosInstance
  
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    })
    this.setupInterceptors()
  }
}
```

### Interceptores
- **Request**: Inyección automática de JWT token
- **Response**: Refresh automático de tokens expirados
- **Error**: Manejo centralizado de errores HTTP

## 🔐 Autenticación API

### AuthApi (`authApi.ts`)

#### Login
```typescript
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@ejemplo.com",
  "password": "password123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-12-10T15:30:00Z",
  "user": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "usuario@ejemplo.com",
    "active": true,
    "role": "Admin",
    "branchId": 1,
    "branchName": "Sucursal Centro"
  }
}
```

#### Refresh Token
```typescript
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-12-10T16:00:00Z"
}
```

#### Logout
```typescript
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "message": "Logout successful"
}
```

#### Change Password
```typescript
PUT /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

#### Forgot Password
```typescript
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "usuario@ejemplo.com"
}

// Response
{
  "message": "Password reset email sent"
}
```

#### Reset Password
```typescript
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "email": "usuario@ejemplo.com",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

## 🍽️ Órdenes API

### OrderApi (`orderApi.ts`)

#### Get Orders (Lista paginada)
```typescript
GET /orders?page=1&pageSize=20&branchId=1&status=taken
Authorization: Bearer <token>

// Response
{
  "items": [
    {
      "id": 1,
      "branchId": 1,
      "branchName": "Sucursal Centro",
      "takenById": 1,
      "takenByName": "Juan Pérez",
      "customerId": 1,
      "customerName": "María García",
      "customerPhone": "3001234567",
      "addressId": 1,
      "address": {
        "id": 1,
        "customerId": 1,
        "street": "Calle 123 #45-67",
        "neighborhood": "Centro",
        "city": "Bogotá",
        "phone": "3001234567",
        "isDefault": true,
        "deliveryFee": 3000
      },
      "type": "delivery",
      "deliveryFee": 3000,
      "reservedFor": null,
      "subtotal": 25000,
      "total": 28000,
      "discountTotal": 0,
      "notes": "Sin cebolla",
      "status": "taken",
      "createdAt": "2024-12-10T10:00:00Z",
      "updatedAt": "2024-12-10T10:00:00Z",
      "orderDetails": [...],
      "bankPayments": [...],
      "appPayments": [...]
    }
  ],
  "totalCount": 50,
  "page": 1,
  "pageSize": 20,
  "totalPages": 3,
  "hasPreviousPage": false,
  "hasNextPage": true
}
```

#### Get Order by ID
```typescript
GET /orders/1
Authorization: Bearer <token>
```

#### Create Order
```typescript
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "branchId": 1,
  "takenById": 1,
  "customerId": 1,
  "addressId": 1,
  "loyaltyRuleId": null,
  "type": "delivery",
  "deliveryFee": 3000,
  "reservedFor": null,
  "notes": "Sin cebolla",
  "orderDetails": [
    {
      "productId": 1,
      "quantity": 2,
      "unitPrice": 12000,
      "discount": 0,
      "notes": "Bien cocido"
    }
  ],
  "bankPayments": [
    {
      "bankId": 1,
      "amount": 15000
    }
  ],
  "appPayments": [
    {
      "appId": 1,
      "amount": 13000
    }
  ]
}
```

#### Update Order
```typescript
PUT /orders/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "customerId": 1,
  "addressId": 1,
  "notes": "Actualizado",
  "deliveryId": 2
}
```

#### Cancel Order
```typescript
DELETE /orders/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Cliente canceló"
}
```

#### Update Order Status
```typescript
PATCH /orders/1/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_preparation"
}
```

#### Complete Order
```typescript
POST /orders/1/complete
Authorization: Bearer <token>
```

#### Prepare Order
```typescript
POST /orders/1/prepare
Authorization: Bearer <token>
```

#### Ready Order
```typescript
POST /orders/1/ready
Authorization: Bearer <token>
```

#### Deliver Order
```typescript
POST /orders/1/deliver
Authorization: Bearer <token>
```

#### Update Delivery Location
```typescript
PATCH /orders/1/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 4.6097,
  "longitude": -74.0817,
  "deliverymanId": 1
}
```

#### Get Delivery Orders (for deliveryman)
```typescript
GET /orders/delivery?deliverymanId=1&status=on_the_way
Authorization: Bearer <token>

// Response
{
  "items": [
    {
      "id": 1,
      "customerName": "María García",
      "customerPhone": "3001234567",
      "address": {
        "id": 1,
        "street": "Calle 123 #45-67",
        "neighborhood": "Centro",
        "city": "Bogotá",
        "latitude": 4.6097,
        "longitude": -74.0817,
        "deliveryFee": 3000
      },
      "total": 28000,
      "deliveryFee": 3000,
      "notes": "Sin cebolla",
      "status": "on_the_way",
      "assignedAt": "2024-12-10T10:30:00Z",
      "estimatedDelivery": "2024-12-10T11:00:00Z"
    }
  ],
  "totalCount": 3
}
```

## 🛍️ Productos API

### ProductApi (`productApi.ts`)

#### Get Products
```typescript
GET /products?page=1&pageSize=50&categoryId=1&active=true
Authorization: Bearer <token>

// Response
{
  "data": {
    "items": [
      {
        "id": 1,
        "categoryId": 1,
        "categoryName": "Platos Principales",
        "branchId": 1,
        "branchName": "Sucursal Centro",
        "name": "Arroz con Pollo",
        "price": 12000,
        "stock": 50,
        "active": true,
        "createdAt": "2024-12-10T08:00:00Z",
        "updatedAt": "2024-12-10T08:00:00Z"
      }
    ],
    "totalCount": 25,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
}
```

#### Get Product by ID
```typescript
GET /products/1
Authorization: Bearer <token>
```

#### Create Product
```typescript
POST /products
Authorization: Bearer <token>
Content-Type: application/json

{
  "categoryId": 1,
  "name": "Nuevo Producto",
  "price": 15000,
  "stock": 100,
  "active": true
}
```

#### Update Product
```typescript
PUT /products/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Producto Actualizado",
  "price": 16000,
  "stock": 80,
  "active": true
}
```

#### Delete Product
```typescript
DELETE /products/1
Authorization: Bearer <token>
```

### ProductCategoryApi (`productCategoryApi.ts`)

#### Get Product Categories
```typescript
GET /product-categories?page=1&pageSize=50&branchId=1
Authorization: Bearer <token>
```

#### Create Product Category
```typescript
POST /product-categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nueva Categoría"
}
```

## 👥 Clientes API

### CustomerApi (`customerApi.ts`)

#### Get Customers
```typescript
GET /customers?page=1&pageSize=50&name=maria&phone=300
Authorization: Bearer <token>

// Response
{
  "data": {
    "items": [
      {
        "id": 1,
        "name": "María García",
        "phone1": "3001234567",
        "phone2": "3007654321",
        "branchId": 1,
        "branchName": "Sucursal Centro",
        "active": true,
        "createdAt": "2024-12-10T08:00:00Z",
        "updatedAt": "2024-12-10T08:00:00Z",
        "totalOrders": 15,
        "lastOrderDate": "2024-12-09T18:30:00Z",
        "addresses": [
          {
            "id": 1,
            "customerId": 1,
            "neighborhoodId": 1,
            "neighborhoodName": "Centro",
            "address": "Calle 123 #45-67",
            "additionalInfo": "Apartamento 301",
            "latitude": 4.6097,
            "longitude": -74.0817,
            "isPrimary": true,
            "createdAt": "2024-12-10T08:00:00Z",
            "updatedAt": "2024-12-10T08:00:00Z",
            "deliveryFee": 3000
          }
        ]
      }
    ],
    "totalCount": 100,
    "page": 1,
    "pageSize": 50,
    "totalPages": 2,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

#### Get Customer by ID
```typescript
GET /customers/1
Authorization: Bearer <token>
```

#### Create Customer
```typescript
POST /customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nuevo Cliente",
  "phone1": "3001234567",
  "phone2": "3007654321",
  "branchId": 1,
  "initialAddress": {
    "neighborhoodId": 1,
    "address": "Calle 123 #45-67",
    "additionalInfo": "Apartamento 301",
    "latitude": 4.6097,
    "longitude": -74.0817,
    "isPrimary": true,
    "deliveryFee": 3000
  }
}
```

#### Update Customer
```typescript
PUT /customers/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Cliente Actualizado",
  "phone1": "3001111111",
  "active": true
}
```

#### Create Customer Address
```typescript
POST /customers/1/addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "neighborhoodId": 2,
  "address": "Carrera 456 #78-90",
  "additionalInfo": "Casa",
  "latitude": 4.6100,
  "longitude": -74.0820,
  "isPrimary": false,
  "deliveryFee": 4000
}
```

#### Update Customer Address
```typescript
PUT /customers/1/addresses/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "Dirección Actualizada",
  "isPrimary": true
}
```

## 🏦 Bancos y Apps API

### BankApi (`bankApi.ts`)

#### Get Banks
```typescript
GET /banks?page=1&pageSize=50&active=true
Authorization: Bearer <token>

// Response
{
  "items": [
    {
      "id": 1,
      "name": "Bancolombia",
      "accountNumber": "1234567890",
      "active": true,
      "createdAt": "2024-12-10T08:00:00Z",
      "updatedAt": "2024-12-10T08:00:00Z"
    }
  ],
  "totalCount": 5,
  "page": 1,
  "pageSize": 50,
  "totalPages": 1,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

#### Create Bank
```typescript
POST /banks
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nuevo Banco",
  "accountNumber": "0987654321"
}
```

### AppApi (`appApi.ts`)

#### Get Apps
```typescript
GET /apps?page=1&pageSize=50&active=true
Authorization: Bearer <token>

// Response
{
  "items": [
    {
      "id": 1,
      "name": "Rappi",
      "active": true,
      "createdAt": "2024-12-10T08:00:00Z",
      "updatedAt": "2024-12-10T08:00:00Z"
    }
  ],
  "totalCount": 3,
  "page": 1,
  "pageSize": 50,
  "totalPages": 1,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

#### Create App
```typescript
POST /apps
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nueva App"
}
```

## 💰 Pagos API

### BankPaymentApi (`bankPaymentApi.ts`)

#### Get Bank Payments
```typescript
GET /bank-payments?page=1&pageSize=50&bankId=1&fromDate=2024-12-01&toDate=2024-12-31
Authorization: Bearer <token>
```

#### Create Bank Payment
```typescript
POST /bank-payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": 1,
  "bankId": 1,
  "amount": 15000
}
```

### AppPaymentApi (`appPaymentApi.ts`)

#### Get App Payments
```typescript
GET /app-payments?page=1&pageSize=50&appId=1&isSettled=false&fromDate=2024-12-01&toDate=2024-12-31
Authorization: Bearer <token>
```

#### Create App Payment
```typescript
POST /app-payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": 1,
  "appId": 1,
  "amount": 13000
}
```

#### Settle App Payments
```typescript
POST /app-payments/settle
Authorization: Bearer <token>
Content-Type: application/json

{
  "appPaymentIds": [1, 2, 3],
  "bankId": 1,
  "settlementDate": "2024-12-10T15:30:00Z"
}
```

## 🏪 Sucursales API

### BranchApi (`branchApi.ts`)

#### Get Branches
```typescript
GET /branches?page=1&pageSize=50
Authorization: Bearer <token>

// Response
{
  "items": [
    {
      "id": 1,
      "name": "Sucursal Centro",
      "address": "Calle 123 #45-67",
      "phone1": "6012345678",
      "phone2": "6018765432",
      "createdAt": "2024-12-10T08:00:00Z",
      "updatedAt": "2024-12-10T08:00:00Z",
      "totalUsers": 5,
      "totalCustomers": 150,
      "totalNeighborhoods": 10,
      "activeUsers": 4,
      "activeCustomers": 120,
      "neighborhoods": [...],
      "users": [...]
    }
  ],
  "totalCount": 3,
  "page": 1,
  "pageSize": 50,
  "totalPages": 1,
  "hasPreviousPage": false,
  "hasNextPage": false
}
```

#### Get Branch by ID
```typescript
GET /branches/1
Authorization: Bearer <token>
```

#### Create Branch
```typescript
POST /branches
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nueva Sucursal",
  "address": "Carrera 456 #78-90",
  "phone1": "6011111111",
  "phone2": "6022222222"
}
```

## 👤 Usuarios API

### UserApi (`userApi.ts`)

#### Get Users
```typescript
GET /users?page=1&pageSize=50&branchId=1&role=Admin
Authorization: Bearer <token>
```

#### Create User
```typescript
POST /users
Authorization: Bearer <token>
Content-Type: application/json

{
  "branchId": 1,
  "name": "Nuevo Usuario",
  "email": "nuevo@ejemplo.com",
  "role": "Cashier",
  "password": "password123",
  "phone": "3001234567"
}
```

#### Update User
```typescript
PUT /users/1
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Usuario Actualizado",
  "email": "actualizado@ejemplo.com",
  "role": "Admin",
  "phone": "3001111111"
}
```

## 📊 Reportes API

### Dashboard API
```typescript
GET /dashboard/global
Authorization: Bearer <token>

GET /dashboard/branch/1
Authorization: Bearer <token>

GET /dashboard/deliveryman/1
Authorization: Bearer <token>
```

## 📍 Geolocalización API

### DeliveryLocationApi (`deliveryLocationApi.ts`)

#### Update Deliveryman Location
```typescript
PATCH /delivery/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 4.6097,
  "longitude": -74.0817,
  "accuracy": 10.5,
  "timestamp": "2024-12-10T10:30:00Z"
}

// Response
{
  "success": true,
  "message": "Location updated successfully"
}
```

#### Get Nearby Orders
```typescript
GET /delivery/nearby?latitude=4.6097&longitude=-74.0817&radius=1000
Authorization: Bearer <token>

// Response
{
  "nearbyOrders": [
    {
      "orderId": 1,
      "distance": 450.5,
      "address": "Calle 123 #45-67",
      "customerName": "María García",
      "canDeliver": false
    },
    {
      "orderId": 2,
      "distance": 15.2,
      "address": "Carrera 456 #78-90",
      "customerName": "Juan Pérez",
      "canDeliver": true
    }
  ]
}
```

#### Calculate Distance
```typescript
POST /delivery/distance
Authorization: Bearer <token>
Content-Type: application/json

{
  "origin": {
    "latitude": 4.6097,
    "longitude": -74.0817
  },
  "destination": {
    "latitude": 4.6100,
    "longitude": -74.0820
  }
}

// Response
{
  "distance": 156.8,
  "unit": "meters",
  "estimatedTime": 3.5,
  "unit": "minutes"
}
```

#### Start Delivery Tracking
```typescript
POST /delivery/tracking/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": 1,
  "deliverymanId": 1
}

// Response
{
  "trackingId": "track_123456",
  "message": "Tracking started successfully"
}
```

#### Stop Delivery Tracking
```typescript
POST /delivery/tracking/stop
Authorization: Bearer <token>
Content-Type: application/json

{
  "trackingId": "track_123456",
  "orderId": 1,
  "reason": "delivered"
}
```

### Reportes API
```typescript
GET /reports/sales?fromDate=2024-12-01&toDate=2024-12-31&branchId=1
Authorization: Bearer <token>

GET /reports/products?fromDate=2024-12-01&toDate=2024-12-31&branchId=1
Authorization: Bearer <token>

GET /reports/payments?fromDate=2024-12-01&toDate=2024-12-31&branchId=1
Authorization: Bearer <token>

GET /reports/delivery?fromDate=2024-12-01&toDate=2024-12-31&deliverymanId=1
Authorization: Bearer <token>
```

## 🔧 Manejo de Errores

### Estructura de Error
```typescript
interface ApiError {
  message: string
  code?: string
  details?: any
  errors?: Record<string, string[]>
}
```

### Códigos de Error Comunes
- `400`: Bad Request - Datos de entrada inválidos
- `401`: Unauthorized - Token inválido o expirado
- `403`: Forbidden - Sin permisos para la acción
- `404`: Not Found - Recurso no encontrado
- `409`: Conflict - Conflicto de datos (ej: email duplicado)
- `422`: Unprocessable Entity - Error de validación
- `500`: Internal Server Error - Error del servidor

### Ejemplo de Error Response
```json
{
  "message": "Validation failed",
  "errors": {
    "email": ["El email es requerido", "El email debe ser válido"],
    "password": ["La contraseña debe tener al menos 8 caracteres"]
  }
}
```

---

**Próximos pasos**: Ver [Development Guide](./development.md) para implementación y mejores prácticas.
