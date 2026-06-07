# Guide des Tests

## Structure des tests

```
apps/api/src/
├── auth/
│   ├── auth.service.ts
│   └── auth.service.spec.ts     # Tests unitaires
├── test/
│   └── auth.e2e-spec.ts         # Tests E2E
```

## Lancer les tests

### Tests unitaires
```bash
pnpm test                # Lancer une fois
pnpm test:watch        # Mode watch
pnpm test:cov          # Avec coverage
```

### Tests E2E
```bash
pnpm --filter @signal/api test:e2e
```

## Coverage

Le seuil minimum de coverage est défini à **50%**. Vérifiez avec :
```bash
pnpm test:cov
```

Rapport HTML : `apps/api/coverage/lcov-report/index.html`

## Bonnes pratiques

1. **Nommer les tests** avec `describe()` + `it()` ou `test()`
2. **Mocker les dépendances** avec `jest.spyOn()` ou `jest.fn()`
3. **Un test = une responsabilité** (pas plusieurs assertions floues)
4. **Nettoyer après** avec `afterEach()` / `afterAll()`

## Exemple simple

```typescript
describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should get a user by ID', async () => {
    const result = await service.findById('123');
    expect(result).toBeDefined();
    expect(result.id).toBe('123');
  });
});
```

## CI/CD

La pipeline GitHub Actions lance automatiquement les tests sur chaque push/PR :
- Lint
- Build
- Tests + Coverage

Voir `.github/workflows/ci.yml`
