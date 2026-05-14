# Arm Academy

**Arm Academy** is a Udemy-style learning platform built for Armenian-speaking learners and educators. Tutors publish courses, students enroll, content is moderated, and payments flow through Stripe or PayPal.me.

Live: [armacademy.am](https://armacademy.am)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2 + Django REST Framework |
| Auth | JWT (SimpleJWT) + TOTP 2FA + Email/Phone OTP |
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui |
| State | Zustand + TanStack Query v5 |
| Database | PostgreSQL 15 (SQLite for local dev) |
| Cache / Queue | Redis 7 + Celery |
| Email | Brevo SMTP |
| SMS | Zadarma API |
| Payments | Stripe (test mode) + PayPal.me per-tutor fallback |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions → ghcr.io → EC2 (port 8080) |
| Server | AWS EC2 t3.micro, Ubuntu 22.04, eu-north-1 |

---

## Project Structure

```
Arm-Academy/
├── apps/
│   ├── users/        # Auth, profiles, 2FA, OTP, lockout
│   ├── courses/      # Course + Section + Class (lecture), enroll, moderation
│   ├── groups/       # Community groups, membership
│   ├── messaging/    # DMs, group chat
│   ├── videos/       # VideoAccessToken (anti-piracy), recordings
│   ├── ratings/      # Reviews, progress, attendance, certificates
│   ├── payments/     # Stripe checkout, manual/PayPal.me fallback
│   └── moderation/   # ContentReport, moderation_status workflow
├── config/           # Django settings, urls, wsgi/asgi
├── frontend/         # React/Vite SPA
│   └── src/
│       ├── api/      # Axios client with JWT auto-refresh
│       ├── components/
│       ├── hooks/    # useToast (global Zustand store)
│       ├── pages/
│       └── store/    # authStore (Zustand + persist)
├── nginx/            # Multi-stage Dockerfile: builds React → Nginx
├── deploy/
│   ├── deploy.sh     # One-command first-deploy script (run once on server)
│   └── k8s/          # Kubernetes manifests for k3s (optional)
├── Dockerfile        # Backend image
├── docker-compose.yml
└── .env.example
```

---

## Local Development

### Prerequisites

- Python 3.10+
- Node 20+
- Docker + Docker Compose (optional, for the full stack locally)

### Backend

```bash
# 1. Create and activate virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install Python deps
pip install -r requirements.txt

# 3. Copy and configure environment
cp .env.example .env
# SQLite is used by default when DATABASE_URL is blank

# 4. Apply migrations
python manage.py migrate

# 5. Create a superuser
python manage.py createsuperuser

# 6. Start dev server
python manage.py runserver
# API: http://localhost:8000/api/
# Admin: http://localhost:8000/admin/
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

### Full Stack with Docker Compose

```bash
# Copy env and set passwords
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, SECRET_KEY, EMAIL creds, etc.

# Build and start everything (Django + Celery + PostgreSQL + Redis + Nginx+React)
docker compose up --build

# App runs on http://localhost:8080
# Apply migrations (first run only)
docker compose exec web python manage.py migrate
docker compose exec web python manage.py createsuperuser
```

---

## CI/CD Pipeline

Merging to `main` triggers an automatic deploy.

```
push to main
    │
    ├── CI (ci.yml)
    │   ├── Django tests (with PostgreSQL + Redis services)
    │   ├── flake8 lint
    │   └── Docker build check (no push)
    │
    └── Deploy (deploy.yml)
        ├── Build backend image  → ghcr.io/thesharaavakian/arm-academy:latest
        ├── Build frontend image → ghcr.io/thesharaavakian/arm-academy-frontend:latest
        └── SSH to 13.61.77.153
            ├── docker compose pull   (fetch new images)
            ├── docker compose up -d  (restart; NEVER rebuilds locally)
            ├── manage.py migrate
            └── manage.py collectstatic
```

**The hzortech app at `/opt/hzortech/` is never touched.** Arm Academy deploys to `/opt/arm-academy/` on port 8080.

### Required GitHub Actions Secrets

Go to `github.com/Thesharaavakian/Arm-Academy → Settings → Secrets and variables → Actions`:

| Secret | Value |
|---|---|
| `EC2_SSH_KEY` | Full text of `~/.ssh/hzortech_deploy` private key |
| `EC2_HOST` | `13.61.77.153` |
| `EC2_USER` | `ubuntu` |

`GITHUB_TOKEN` is auto-provided by GitHub — no secret needed for ghcr.io push.

### First Deploy (run once on server)

Before CI/CD can do rolling deploys, the server needs the `.env` file and initial containers. SSH in and run the bootstrap script:

```bash
ssh -i ~/.ssh/hzortech_deploy ubuntu@13.61.77.153
curl -fsSL https://raw.githubusercontent.com/Thesharaavakian/Arm-Academy/main/deploy/deploy.sh | sudo bash
```

After that, all future deploys happen automatically on `git push origin main`.

---

## User Roles

| Role | Can do |
|---|---|
| `student` | Browse, enroll, review, message tutors |
| `tutor` / `teacher` | Everything above + create/manage courses |
| `admin` | Everything + approve/reject content, confirm payments |

---

## Key API Endpoints

### Auth
```
POST /api/auth/register/
POST /api/auth/login/          → returns access + refresh, or requires_2fa flag
POST /api/auth/token/refresh/
POST /api/auth/logout/
POST /api/auth/verify-email/
POST /api/auth/forgot-password/
POST /api/auth/reset-password/
GET  /api/auth/setup-2fa/      → returns QR code
POST /api/auth/setup-2fa/      → confirms TOTP code
POST /api/auth/verify-2fa/
```

### Courses
```
GET  /api/courses/             → list (public)
POST /api/courses/             → create (tutor/admin)
GET  /api/courses/{id}/
POST /api/courses/{id}/enroll/
GET  /api/courses/{id}/students/
GET  /api/courses/my_courses/
GET  /api/courses/featured/
POST /api/courses/{id}/publish/
POST /api/courses/{id}/unpublish/
```

### Payments
```
POST /api/payments/initiate/{course_id}/
POST /api/payments/webhook/            (Stripe webhook)
POST /api/payments/confirm/{id}/       (admin — confirm manual payment)
GET  /api/payments/my/
```

### Users / Tutors
```
GET  /api/users/
GET  /api/users/{id}/
GET  /api/users/{id}/courses/
GET  /api/users/{id}/reviews/
GET  /api/users/featured_tutors/
GET  /api/users/site_stats/
POST /api/users/upload_avatar/
```

Full documentation: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

---

## Environment Variables

See [.env.example](.env.example) for the full list with explanations.

Critical production variables:

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret — generate with `openssl rand -hex 32` |
| `DATABASE_URL` | PostgreSQL connection string |
| `ALLOWED_HOSTS` | Comma-separated domains/IPs |
| `EMAIL_HOST_PASSWORD` | Brevo SMTP key |
| `ZADARMA_API_KEY/SECRET` | SMS via Zadarma |
| `STRIPE_SECRET_KEY` | Stripe (test mode OK) |
| `CELERY_ALWAYS_EAGER` | `False` in production |

---

## Content Moderation

Courses go through a `moderation_status` workflow before being public:

```
draft → pending_review → approved (visible to all)
                       → rejected (feedback to tutor)
                       → suspended (admin action)
```

Adult content (`content_rating=adult`) triggers an age gate on the frontend.

---

## Anti-Piracy

- `VideoAccessToken` — UUID token bound to user IP, expires in 2 hours
- Moving watermark with user email overlaid on every video
- `controlsList="nodownload"` + right-click disabled on video element

---

## License

MIT License. See [LICENSE](LICENSE) for details.

---

Made with love for the Armenian learning community.
