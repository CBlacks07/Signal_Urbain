# CI/CD Pipeline - GitHub Actions

La pipeline CI/CD automatise les checks de qualité et les builds pour chaque push et pull request.

## Vue d'ensemble

```
.github/workflows/ci.yml
├── Lint & Format Check (ESLint + Prettier)
├── Build (API, Dashboard)
└── Test (API avec PostgreSQL + Redis)
    └── Coverage Report (Codecov)
```

## Quand ça s'exécute ?

- ✅ **Chaque push** sur `main` ou `develop`
- ✅ **Chaque pull request** vers `main` ou `develop`

## Étapes de la pipeline

### 1️⃣ Lint & Format Check
```bash
pnpm lint          # ESLint check
pnpm format:check  # Prettier check
```

**Échoue si :**
- Code ne suit pas les règles ESLint
- Formatage non conforme Prettier

### 2️⃣ Build
Lance en parallèle pour **@signal/api** et **@signal/dashboard** :
```bash
pnpm --filter @signal/api build
pnpm --filter @signal/dashboard build
```

**Échoue si :**
- Erreurs TypeScript
- Dépendances manquantes
- Build échoue

### 3️⃣ Test (API)
Spin up des services Docker :
- **PostgreSQL** 16 (test database)
- **Redis** 7 (cache)

Puis lance :
```bash
pnpm --filter @signal/api test        # Tests unitaires
pnpm --filter @signal/api test:cov    # Avec coverage
```

Upload coverage à **Codecov** pour tracking.

## Résultats et badges

Voir les résultats sur GitHub :
```
Pull Request → Checks tab
Repository → Actions tab
```

Badge pour le README :
```markdown
[![CI/CD Pipeline](https://github.com/YOUR_ORG/signal-urbain/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/YOUR_ORG/signal-urbain/actions)
```

## Configuration locale (optionnel)

Tester la pipeline localement avec **act** :

```bash
# Installer act
brew install act  # macOS
# ou
choco install act # Windows (Chocolatey)
# ou
https://github.com/nektos/act

# Lancer
act push   # Simule un push
act pull_request  # Simule une PR
```

## Dépanner les erreurs

### ❌ "Lint failed"
```bash
# Fix automatiquement
pnpm lint:fix
pnpm format
git add .
git commit -m "chore: fix linting"
git push
```

### ❌ "Build failed"
```bash
# Vérifiez les erreurs
pnpm --filter @signal/api build
pnpm --filter @signal/dashboard build
```

### ❌ "Test failed"
```bash
# Lancez les tests localement
docker-compose -f docker-compose.dev.yml up -d
pnpm db:migrate
pnpm --filter @signal/api test
```

### ❌ "Coverage threshold not met"
Voir `jest.config.js` pour le threshold (actuellement **50%**).

## Configuration du threshold

```javascript
// apps/api/jest.config.js
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
}
```

Pour augmenter le coverage :
```bash
pnpm test:cov --coverage
# Ouvre : apps/api/coverage/lcov-report/index.html
```

## Secrets GitHub (production)

Pour le déploiement, ajoutez ces secrets dans GitHub :
```
Settings → Secrets and variables → Actions
```

Exemples :
- `DATABASE_URL` - Production DB
- `DEPLOYMENT_KEY` - SSH key pour serveur
- `DOCKER_USERNAME` - Registry Docker

Utilisez dans le workflow :
```yaml
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Speedup la pipeline

### Cache npm
Déjà activé. Les dépendances sont cachées entre les runs.

### Artifact upload
Les builds sont uploadés (optionnel pour debug) :
```
Artifacts → api-build / dashboard-build
```

### Runs parallèles
Jobs indépendants lancent en parallèle :
- `lint` vs `build` vs `test` → **~5-10 min** total
- Sinon séquentiel → **~15-20 min**

## Branches protégées

Recommandé sur GitHub :

```
Settings → Branches → Branch protection rules

main:
  ✓ Require status checks to pass
    - lint
    - build
    - test
  ✓ Require code reviews (minimum 1)
  ✓ Dismiss stale pull request approvals
  ✓ Require branches to be up to date before merging
```

## Next steps

- [ ] Ajouter étape de **test E2E** (Cypress/Playwright)
- [ ] Ajouter étape de **security scanning** (Dependabot, SAST)
- [ ] Configurer **auto-deploy** à staging/prod
- [ ] Ajouter **Slack notifications** pour résultats
