# Guide de Contribution

## Avant de commencer

1. **Créez une branche** : `git checkout -b feature/ma-feature` ou `git checkout -b fix/mon-bug`
2. **Installez les dépendances** : `pnpm install`
3. **Lancez les services** : `pnpm docker:up`

## Workflow de développement

### 1. Code & Commit

```bash
# Développez votre feature
# Lancez le dev server
pnpm dev:api

# Avant de commit : lint + format
pnpm lint:fix
pnpm format

# Vérifiez les tests
pnpm test
```

### 2. Standards de code

- **ESLint** : configuration dans `.eslintrc.json`
- **Prettier** : configuration dans `.prettierrc`
- **TypeScript strict** : `strict: true` dans `tsconfig.json`
- **Pas de `any`** : utiliser `unknown` ou des types génériques

### 3. Commits

Utilisez **Conventional Commits** :
```
feat: add new feature
fix: correct a bug
docs: update documentation
refactor: restructure code
test: add/update tests
chore: update dependencies
```

Exemple :
```
feat(auth): add multi-factor authentication
```

### 4. Pull Request

1. **Poussez votre branche** : `git push origin feature/ma-feature`
2. **Ouvrez une PR** sur GitHub avec une description claire
3. **Attendez la review** (CI/CD tests doivent passer)
4. **Répondez aux commentaires** et mettez à jour votre PR si nécessaire

## Checklist avant de soumettre

- [ ] Tests ajoutés/mis à jour
- [ ] `pnpm lint:fix` passé
- [ ] `pnpm test` passé
- [ ] `pnpm format` appliqué
- [ ] Documentation mise à jour si nécessaire
- [ ] Pas de `console.log` en prod
- [ ] Pas de secrets en code

## Architecture

### API (NestJS)
```
src/
├── common/          # Utilitaires partagés
├── auth/            # Authentification
├── users/           # Gestion des utilisateurs
├── incidents/       # Signalements
└── ...autres modules
```

### Dashboard (React)
```
src/
├── components/      # Composants réutilisables
├── pages/          # Pages principales
├── hooks/          # Custom hooks
├── services/       # Appels API
└── types/          # Types TypeScript
```

### Mobile (Expo)
```
app/
├── (tabs)/         # Écrans avec tabs
├── incident/       # Détail incident
└── login.tsx       # Authentification
```

## Questions ?

Consultez la documentation complète dans `README.md` ou rejoignez le Slack/Discord du projet.
