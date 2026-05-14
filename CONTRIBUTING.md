# Contributing to Arm Academy

## Code of Conduct

- Be respectful and inclusive
- Focus on the code, not the person
- Respect diversity and different opinions

---

## Development Setup

### Backend

```bash
git clone https://github.com/Thesharaavakian/Arm-Academy.git
cd Arm-Academy
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Full stack via Docker

```bash
cp .env.example .env   # edit passwords
docker compose up --build
```

---

## Workflow

### Branch naming

| Prefix | Use for |
|---|---|
| `feature/` | New features |
| `fix/` | Bug fixes |
| `docs/` | Documentation |
| `refactor/` | Refactoring without behaviour change |

### Commit messages

Use conventional commits:

```
feat: add video watermark component
fix: age calculation wrong near leap years
docs: update API endpoint table
refactor: extract _fire() helper for Celery tasks
```

### Pull requests

1. Fork → branch → push
2. Open PR against `main`
3. CI must pass (tests + lint + docker build)
4. One approval from a maintainer

#### PR checklist

- [ ] Tests added or updated
- [ ] `manage.py makemigrations` run if models changed
- [ ] `.env.example` updated if new env vars added
- [ ] No secrets, passwords, or keys in code

---

## Code Conventions

### Python / Django

- PEP 8, max line length 120
- `flake8 apps/ config/ --max-line-length=120 --exclude=migrations`
- No docstrings explaining *what* code does — only non-obvious *why*
- Views: one `ViewSet` per model; use `@action` for custom endpoints
- Serializers: put computed fields in `SerializerMethodField` or use `source=`
- Fire-and-forget Celery tasks: use the `_fire(task, *args)` pattern

### React / Frontend

- Functional components only
- TanStack Query for all data fetching — no `useEffect` + `fetch`
- Global toast via `useToast` hook (Zustand store) — not local state
- All pages wrapped in `React.lazy` + `Suspense` — prevents blank pages on error
- No hardcoded / fake data — every value must come from the API

### Database

- Add migrations for every model change: `python manage.py makemigrations`
- Never edit existing migrations in production branches
- Use `select_related` / `prefetch_related` / annotations to avoid N+1

---

## Testing

```bash
# Django tests
python manage.py test

# With coverage
pip install coverage
coverage run manage.py test
coverage report
```

Tests live in `apps/<appname>/tests.py`. CI runs them against a real PostgreSQL service — no mocking the database.

---

## Database migrations

```bash
# After changing a model
python manage.py makemigrations
python manage.py migrate

# Check what would run without applying
python manage.py showmigrations
```

---

## Reporting issues

Include:
- Django / Python / Node version
- Steps to reproduce
- Expected vs actual behaviour
- Error traceback or screenshot

---

## Questions

Open a [GitHub Discussion](https://github.com/Thesharaavakian/Arm-Academy/discussions) or email dev@armacademy.am.
