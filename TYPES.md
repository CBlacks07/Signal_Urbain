# Types Partagés - @signal/types

Ce package contient tous les types TypeScript partagés entre l'API, le Dashboard et l'App Mobile.

## Structure

```
packages/types/src/index.ts
├── Enums (Role, Status, Priority, etc.)
├── Models (User, Incident, Comment, etc.)
├── DTOs (Data Transfer Objects)
└── API Responses
```

## Types principaux

### 1. **User** - Utilisateur
```typescript
interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  role: 'CITIZEN' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';
  communeId?: string;
  avatarUrl?: string;
  isVerified: boolean;
  createdAt: string;
}
```

### 2. **Incident** - Signalement urbain
```typescript
interface Incident {
  id: string;
  refCode: string;  // ex: INC-20260430-001
  category: IncidentCategory;
  status: IncidentStatus;
  priority: Priority;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrls?: string[];
  citizenId: string;
  communeId: string;
  agentId?: string;
  upvotes: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}
```

### 3. **Comment** - Commentaire sur incident
```typescript
interface Comment {
  id: string;
  content: string;
  userId: string;
  user?: User;  // User object si inclus
  incidentId: string;
  createdAt: string;
  updatedAt: string;
}
```

### 4. **Notification** - Notifications push/websocket
```typescript
interface Notification {
  id: string;
  type: 'STATUS_UPDATE' | 'NEW_COMMENT' | 'UPVOTE' | 'SYSTEM';
  title: string;
  message: string;
  userId: string;
  incidentId?: string;
  isRead: boolean;
  createdAt: string;
}
```

## Enums

### Statuts d'incident
```typescript
type IncidentStatus = 'SIGNALE' | 'ASSIGNE' | 'EN_COURS' | 'RESOLU' | 'REJETE';
```

### Catégories d'incident
```typescript
type IncidentCategory = 
  | 'inondation'
  | 'electrique'
  | 'depotoir'
  | 'route'
  | 'eclairage'
  | 'eau'
  | 'autre';
```

### Priorités
```typescript
type Priority = 'CRITIQUE' | 'HAUTE' | 'MOYENNE' | 'BASSE';
```

### Rôles utilisateur
```typescript
type Role = 'CITIZEN' | 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';
```

## DTOs (Data Transfer Objects)

Les DTOs servent à valider les données reçues en entrée :

```typescript
// Demande d'OTP
interface RequestOtpDto {
  phoneNumber: string;
}

// Vérification d'OTP
interface VerifyOtpDto {
  phoneNumber: string;
  otp: string;
}

// Créer un incident
interface CreateIncidentDto {
  category: IncidentCategory;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrls?: string[];
}

// Mettre à jour le statut
interface UpdateIncidentStatusDto {
  status: IncidentStatus;
  comment?: string;
}

// Commentaire
interface CreateCommentDto {
  content: string;
  incidentId: string;
}

// Pagination
interface PaginationDto {
  page?: number;  // défaut: 1
  limit?: number; // défaut: 20
}
```

## Réponses API

Toutes les réponses API suivent ce format :

```typescript
interface ApiResponse<T = any> {
  statusCode: number;  // 200, 400, 500, etc.
  message: string;     // "Success", "User created", etc.
  data?: T;            // Données optionnelles
  timestamp: string;   // ISO timestamp
}

// Exemple :
{
  "statusCode": 200,
  "message": "Incident created successfully",
  "data": {
    "id": "clm1...",
    "refCode": "INC-20260430-001",
    "title": "Nid-de-poule route Akodessewa",
    ...
  },
  "timestamp": "2026-04-30T10:30:00Z"
}
```

### Réponses paginées
```typescript
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Exemple :
{
  "statusCode": 200,
  "message": "Incidents fetched",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  },
  "timestamp": "2026-04-30T10:30:00Z"
}
```

## Utilisation dans l'API (NestJS)

```typescript
import { CreateIncidentDto, Incident, ApiResponse } from '@signal/types';
import { Controller, Post, Body } from '@nestjs/common';

@Controller('incidents')
export class IncidentsController {
  @Post()
  async createIncident(
    @Body() dto: CreateIncidentDto
  ): Promise<ApiResponse<Incident>> {
    // ...
  }
}
```

## Utilisation dans le Dashboard (React)

```typescript
import { User, Incident, PaginatedResponse } from '@signal/types';

interface IncidentsState {
  incidents: Incident[];
  meta: PaginationMeta;
  loading: boolean;
}

async function fetchIncidents(): Promise<PaginatedResponse<Incident>> {
  const response = await fetch('/api/v1/incidents?page=1&limit=20');
  return response.json();
}
```

## Utilisation dans l'App Mobile (React Native)

```typescript
import { Incident, Comment, CreateCommentDto } from '@signal/types';

async function addComment(comment: CreateCommentDto): Promise<Comment> {
  const response = await fetch(`/api/v1/incidents/${comment.incidentId}/comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  });
  return response.json();
}
```

## Ajouter de nouveaux types

1. Ajouter le type dans `packages/types/src/index.ts`
2. Exporter le type (il l'est automatiquement)
3. Utiliser : `import { MonType } from '@signal/types'`

Tous les types dans ce package sont automatiquement disponibles dans tous les apps grâce au monorepo pnpm.
