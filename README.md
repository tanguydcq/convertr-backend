# Convertr Backend - Multi-Tenant Authentication System

Backend d'authentification sécurisé et multi-tenant pour le CRM Convertr.

## 🚀 Quick Start

### Prérequis
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (ou utiliser Docker)

### Installation avec Docker (Recommandé)

```bash
# Cloner et naviguer dans le projet
cd convertr-backend

# Démarrer les services (PostgreSQL + Backend)
docker-compose up -d

# L'API est disponible sur http://localhost:3000
```

### Installation locale

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npm run prisma:generate

# Démarrer PostgreSQL (via Docker ou local)
docker-compose up -d postgres

# Appliquer les migrations
npm run prisma:migrate

# Peupler la base de données
npm run prisma:seed

# Démarrer le serveur de développement
npm run dev
```

## 📋 Endpoints

### Authentification

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/login` | Authentification email/password |
| POST | `/auth/refresh` | Renouvellement des tokens |
| POST | `/auth/logout` | Invalidation du refresh token |

### Utilisateurs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/me` | Profil de l'utilisateur connecté |

### Leads (Tenant-scoped)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/leads` | Liste des leads du tenant |
| GET | `/leads/:id` | Détail d'un lead |

### Admin (SUPER_ADMIN uniquement)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/admin/tenants` | Créer un tenant |
| GET | `/admin/tenants` | Lister tous les tenants |
| GET | `/admin/tenants/:id` | Détail d'un tenant |
| DELETE | `/admin/tenants/:id` | Supprimer un tenant |

## 🔐 Flow d'Authentification

```
┌──────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION FLOW                         │
└──────────────────────────────────────────────────────────────────┘

1. LOGIN
   Client ─────────────────────────────────────────────► Server
          POST /auth/login
          { email, password }
   
   Client ◄───────────────────────────────────────────── Server
          { accessToken, refreshToken, expiresIn }

2. AUTHENTICATED REQUEST
   Client ─────────────────────────────────────────────► Server
          GET /me
          Authorization: Bearer <accessToken>
   
   Server: Vérifie JWT → Extrait { userId, role, tenantId }

3. TOKEN REFRESH (quand access token expiré)
   Client ─────────────────────────────────────────────► Server
          POST /auth/refresh
          { refreshToken }
   
   Client ◄───────────────────────────────────────────── Server
          { accessToken (new), refreshToken (new) }

4. LOGOUT
   Client ─────────────────────────────────────────────► Server
          POST /auth/logout
          { refreshToken }
   
   Server: Supprime le refresh token de la DB
```

## 🧪 Tests

```bash
# Exécuter tous les tests
npm test

# Mode watch
npm run test:watch

# Avec coverage
npm test -- --coverage
```

## 📝 Exemples curl

### Login

```bash
# Login CLIENT_ADMIN
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"ClientAdmin123!"}'
```

Réponse:
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4...",
  "expiresIn": "15m",
  "user": {
    "id": "uuid",
    "email": "admin@acme.com",
    "role": "CLIENT_ADMIN",
    "tenantId": "tenant-uuid"
  }
}
```

### Accès protégé

```bash
# Récupérer le profil
curl http://localhost:3000/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"

# Lister les leads (du tenant)
curl http://localhost:3000/leads \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### Refresh token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

### Admin (SUPER_ADMIN)

```bash
# Login SUPER_ADMIN
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"super@convertr.io","password":"SuperAdmin123!"}'

# Créer un tenant
curl -X POST http://localhost:3000/admin/tenants \
  -H "Authorization: Bearer <SUPER_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"New Company"}'
```

## 👥 Comptes de test

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | super@convertr.io | SuperAdmin123! |
| CLIENT_ADMIN | admin@acme.com | ClientAdmin123! |
| CLIENT_USER | user@acme.com | ClientUser123! |

## 🔒 Sécurité

- ✅ Passwords hashés avec bcrypt (cost factor 12)
- ✅ JWT avec secret d'au moins 32 caractères
- ✅ Access token courte durée (15 min)
- ✅ Refresh token rotation à chaque utilisation
- ✅ Rate limiting sur /auth/login (5 req / 15 min)
- ✅ Isolation stricte des données par tenant
- ✅ Validation Zod sur tous les inputs

## 📁 Structure du projet

```
convertr-backend/
├── docker-compose.yml
├── Dockerfile
├── package.json
├── prisma/
│   ├── schema.prisma      # Modèles de données
│   └── seed.ts            # Données de test
├── src/
│   ├── index.ts           # Entry point
│   ├── app.ts             # Express app
│   ├── config/            # Configuration
│   ├── lib/               # Utilitaires (JWT, password, prisma)
│   ├── middleware/        # Auth, RBAC, tenant isolation
│   ├── modules/
│   │   ├── auth/          # Login, refresh, logout
│   │   ├── users/         # /me
│   │   ├── leads/         # Leads tenant-scoped
│   │   └── admin/         # Gestion des tenants
│   └── types/             # TypeScript extensions
└── tests/                 # Tests Jest + Supertest
```

## 🛠️ Variables d'environnement

| Variable | Description | Default |
|----------|-------------|---------|
| DATABASE_URL | URL PostgreSQL | - |
| JWT_SECRET | Secret JWT (min 32 chars) | - |
| JWT_EXPIRES_IN | Durée access token | 15m |
| REFRESH_TOKEN_EXPIRES_IN | Durée refresh token | 7d |
| PORT | Port du serveur | 3000 |
| NODE_ENV | Environnement | development |
