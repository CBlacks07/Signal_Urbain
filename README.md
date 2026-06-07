<p align="center">
  <img src="public/signal_urbain.png" alt="Signal Urbain" width="160" />
</p>

<h1 align="center">Signal Urbain</h1>

Plateforme civic-tech de signalement d'incidents urbains au Togo.

Deux interfaces :
- **Signal Urbain Togo** : application mobile (Expo / React Native) pour les citoyens
- **Signal Urbain** : tableau de bord web (React / Vite) pour les mairies et administrateurs

---

## Architecture

```
signal-urbain/
  apps/
    api/           # Backend NestJS (REST + WebSocket)
    dashboard/     # Dashboard mairie — React + Vite + Tailwind
    mobile/        # App citoyenne — Expo SDK 55 + expo-router
  packages/        # (futur) libs partagees
  docker-compose.dev.yml   # PostgreSQL, Redis
```

**Monorepo pnpm workspaces** — toutes les commandes se lancent depuis la racine.

---

## Stack technique

| Couche       | Technologie                                  |
|--------------|----------------------------------------------|
| API          | NestJS 10, Prisma ORM, PostgreSQL 16 (PostGIS) |
| Auth         | JWT + OTP par SMS (Twilio / console en dev)  |
| Stockage     | Cloudinary pour les photos                   |
| Cache        | Redis 7                                      |
| Dashboard    | React 18, Vite 5, Tailwind CSS, Leaflet     |
| Mobile       | Expo SDK 55, React Native 0.83, expo-router  |
| Temps reel   | Socket.IO                                    |

---

## Pre-requis

- **Node.js** >= 18 (recommande : 22 LTS)
- **pnpm** >= 9 (`npm install -g pnpm`)
- **Docker** + Docker Compose (pour PostgreSQL, Redis)
- **Expo Go** sur votre telephone (Android/iOS) pour tester l'app mobile
- **Git**

---

## Installation

### 1. Cloner et installer les dependances

```bash
git clone <url-du-repo>
cd signal-urbain
pnpm install
```

### 2. Lancer les services Docker

PostgreSQL et Redis :

```bash
pnpm docker:up
```

Verifier que tout tourne :

```bash
pnpm docker:logs
```

### 3. Configurer les variables d'environnement

Copier le fichier d'exemple et l'adapter :

```bash
cp apps/api/.env.example apps/api/.env
```

Variables importantes a renseigner dans `apps/api/.env` :

```env
# Base de donnees
DATABASE_URL=postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/signal_urbain?schema=public

# Port de l'API
PORT=3015

# JWT (generer une cle secrete unique)
JWT_SECRET=votre_cle_secrete_ici

# SMS en dev — les OTP s'affichent dans le terminal
SMS_PROVIDER=console

# Cloudinary (stockage des photos — cloudinary.com)
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
```

### 4. Initialiser la base de donnees

```bash
# Appliquer les migrations
pnpm db:migrate

# (Optionnel) Charger les donnees de test (12 incidents a Lome)
pnpm db:seed
```

### 5. Explorer la base de donnees (optionnel)

```bash
pnpm db:studio
```

Ouvre Prisma Studio sur http://localhost:5555.

---

## Demarrage

### API (NestJS)

```bash
pnpm dev:api
```

L'API demarre sur **http://localhost:3015**. Base path : `/api/v1`.

En mode `SMS_PROVIDER=console`, les codes OTP s'affichent directement dans le terminal :
```
OTP pour +22890000001 → 123456
```

### Dashboard (React/Vite)

```bash
pnpm dev:dashboard
```

Ouvre **http://localhost:5173**. Connectez-vous avec un compte ADMIN ou SUPER_ADMIN.

### App mobile (Expo)

```bash
pnpm dev:mobile
```

Scannez le QR code avec **Expo Go** sur votre telephone.

> **Important** : votre telephone et votre PC doivent etre sur le **meme reseau Wi-Fi**.

Si l'app ne se connecte pas a l'API, mettez a jour l'IP dans `apps/mobile/lib/api.ts` :

```typescript
export const API_BASE = 'http://VOTRE_IP_LOCALE:3015/api/v1';
```

Pour trouver votre IP locale :
- **Windows** : `ipconfig` → chercher l'adresse IPv4
- **Mac/Linux** : `ifconfig` ou `ip addr`

---

## Comptes de test

Apres avoir lance le seed (`pnpm db:seed`), les comptes suivants sont disponibles :

| Telephone      | Role        | Nom            |
|----------------|-------------|----------------|
| +22890000001   | CITIZEN     | Ama Koffi      |
| +22891000001   | AGENT       | Kofi Mensah    |

Pour se connecter :
1. Entrez le numero de telephone
2. Le code OTP s'affiche dans le terminal de l'API (mode console)
3. Saisissez le code dans l'app

---

## Roles utilisateur

| Role         | Acces                                                    |
|--------------|----------------------------------------------------------|
| CITIZEN      | App mobile — signaler, commenter, voter                  |
| AGENT        | Dashboard — traiter les incidents assignes               |
| ADMIN        | Dashboard — gerer les incidents de sa commune            |
| SUPER_ADMIN  | Dashboard — gerer toutes les communes et utilisateurs    |

---

## Commandes utiles

```bash
# --- Racine du monorepo ---
pnpm dev:api              # Lancer l'API en mode dev (hot reload)
pnpm dev:dashboard        # Lancer le dashboard en mode dev
pnpm dev:mobile           # Lancer l'app mobile avec Expo

pnpm build                # Build de tous les projets
pnpm lint                 # Lint de tous les projets

# --- Docker ---
pnpm docker:up            # Demarrer PostgreSQL + Redis
pnpm docker:down          # Arreter les services Docker
pnpm docker:logs          # Voir les logs Docker

# --- Base de donnees ---
pnpm db:migrate           # Appliquer les migrations Prisma
pnpm db:seed              # Charger les donnees de test
pnpm db:studio            # Ouvrir Prisma Studio (GUI)
```

---

## API — Endpoints principaux

| Methode | Route                        | Description                    | Auth     |
|---------|------------------------------|--------------------------------|----------|
| POST    | /auth/request-otp            | Demander un code OTP           | Non      |
| POST    | /auth/verify-otp             | Verifier OTP et obtenir le JWT | Non      |
| GET     | /incidents                   | Lister les incidents           | Oui      |
| POST    | /incidents                   | Creer un incident              | CITIZEN+ |
| GET     | /incidents/:id               | Detail d'un incident           | Oui      |
| POST    | /incidents/:id/upvote        | Soutenir un incident           | CITIZEN+ |
| DELETE  | /incidents/:id/upvote        | Retirer son soutien            | CITIZEN+ |
| GET     | /incidents/:id/comments      | Commentaires d'un incident     | Oui      |
| POST    | /incidents/:id/comments      | Ajouter un commentaire         | CITIZEN+ |
| GET     | /admin/stats                 | Statistiques globales          | SUPER_ADMIN |
| GET     | /admin/communes              | Lister les communes            | SUPER_ADMIN |
| GET     | /admin/users                 | Lister les utilisateurs        | SUPER_ADMIN |

Documentation Swagger disponible sur **http://localhost:3015/api/docs** (si active).

---

## Structure de la base de donnees

Modeles principaux (Prisma) :

- **User** — citoyens, agents, admins (auth par OTP/SMS)
- **Commune** — communes/mairies du Togo
- **Incident** — signalements avec categorie, statut, priorite, geolocalisation
- **Comment** — commentaires sur les incidents
- **Upvote** — soutiens citoyens (un par utilisateur par incident)
- **StatusHistory** — historique des changements de statut
- **Notification** — notifications in-app
- **AuditLog** — journal d'audit des actions

---

## Deploiement mobile

Pour creer un APK/AAB de production (necessite un compte EAS) :

```bash
cd apps/mobile
eas build --platform android --profile production
```

> Note : les notifications push distantes (Firebase FCM) ne fonctionnent **pas** dans Expo Go depuis le SDK 53. Elles necessitent un **development build** ou un build de production.

---

## Depannage

### L'API ne demarre pas — port 3015 occupe

```bash
# Windows
netstat -ano | findstr :3015
taskkill /F /PID <le_pid>
```

### L'app mobile ne se connecte pas a l'API

1. Verifier que le telephone et le PC sont sur le meme Wi-Fi
2. Mettre a jour `API_BASE` dans `apps/mobile/lib/api.ts` avec votre IP locale
3. Verifier que le pare-feu Windows autorise le port 3015

### Erreur Prisma "migrate"

```bash
# Reinitialiser la base (attention : perd toutes les donnees)
cd apps/api
npx prisma migrate reset
```

### Erreur Expo Go "incompatible SDK"

L'app necessite Expo SDK 55. Mettre a jour Expo Go depuis le Play Store / App Store.

---

## Licence

Projet prive — tous droits reserves.
