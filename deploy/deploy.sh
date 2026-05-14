#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Arm Academy — One-Command Deployer
# Runs on the server. Auto-detects k3s vs Docker Compose.
# SAFE: deploys to isolated namespace, NEVER touches existing workloads.
#
# Usage on the server:
#   chmod +x deploy.sh && sudo bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

REPO_URL="https://github.com/Thesharaavakian/Arm-Academy.git"
APP_DIR="/opt/arm-academy"
DB_PASS=$(openssl rand -hex 16)
SECRET_KEY=$(openssl rand -hex 32)

echo ""
echo "══════════════════════════════════════════════"
echo "   Arm Academy — Server Deploy"
echo "══════════════════════════════════════════════"
echo ""

# ── STEP 1: Audit running services ──────────────────────────────────────────
log "Auditing existing services..."
echo ""
echo "── Running processes on ports 80/443:"
ss -tlnp 2>/dev/null | grep -E ":80|:443" || echo "  (none visible)"
echo "── Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  (docker not running)"
echo "── k3s namespaces:"
kubectl get namespaces 2>/dev/null || echo "  (k3s kubectl not in PATH — trying /usr/local/bin/kubectl)"
K3S_KUBECTL="/usr/local/bin/kubectl"
if [ -f "$K3S_KUBECTL" ]; then
    $K3S_KUBECTL get namespaces 2>/dev/null || true
fi
echo ""
warn "Check above — confirm your existing app is listed and will NOT be touched"
read -p "Continue? [y/N] " -n 1 -r; echo
[[ $REPLY =~ ^[Yy]$ ]] || err "Aborted by user"

# ── STEP 2: Install dependencies ─────────────────────────────────────────────
log "Installing Docker + dependencies..."
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
    log "Docker installed"
else
    log "Docker already installed: $(docker --version)"
fi

if ! command -v git &>/dev/null; then
    apt-get update -q && apt-get install -y git
fi

# ── STEP 3: Clone / update repo ──────────────────────────────────────────────
log "Deploying Arm Academy to $APP_DIR ..."
if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" pull --ff-only
else
    git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ── STEP 4: Write production .env ────────────────────────────────────────────
log "Writing .env.production ..."
cat > .env.production << ENVEOF
DEBUG=False
SECRET_KEY=${SECRET_KEY}
ALLOWED_HOSTS=armacademy.am,www.armacademy.am,13.61.77.153,localhost
DATABASE_URL=postgresql://arm_user:${DB_PASS}@db:5432/arm_academy
REDIS_URL=redis://redis:6379/0
POSTGRES_DB=arm_academy
POSTGRES_USER=arm_user
POSTGRES_PASSWORD=${DB_PASS}
CORS_ALLOWED_ORIGINS=https://armacademy.am,https://www.armacademy.am
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=ab3fe2001@smtp-brevo.com
EMAIL_HOST_PASSWORD=__REPLACE_EMAIL_HOST_PASSWORD__
DEFAULT_FROM_EMAIL=noreply@armacademy.am
ZADARMA_API_KEY=c58cce27727b0d6e0135
ZADARMA_API_SECRET=3def047ef8049ec0a0fd
FRONTEND_URL=https://armacademy.am
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
CELERY_ALWAYS_EAGER=False
ENVEOF
chmod 600 .env.production
log ".env.production written with fresh DB password and secret key"
echo "   (Saved to $APP_DIR/.env.production — keep this file private)"

# ── STEP 5: Detect k3s or standalone ─────────────────────────────────────────
USE_K3S=false
if command -v kubectl &>/dev/null && kubectl get namespaces &>/dev/null 2>&1; then
    USE_K3S=true
elif [ -f /usr/local/bin/kubectl ] && /usr/local/bin/kubectl get namespaces &>/dev/null 2>&1; then
    USE_K3S=true
    export PATH="$PATH:/usr/local/bin"
fi

if $USE_K3S; then
    log "k3s detected — deploying as Kubernetes workloads..."
    # Build images locally (k3s can use local Docker images if containerd is configured)
    # OR build and import into k3s containerd
    docker build -t arm-academy:latest .
    # Build frontend image
    docker build -t arm-academy-frontend:latest -f nginx/Dockerfile .
    # Import into k3s containerd (both images in parallel — each is 400-600 MB)
    if command -v k3s &>/dev/null; then
        docker save arm-academy:latest          | k3s ctr images import - &
        docker save arm-academy-frontend:latest | k3s ctr images import - &
        wait
        log "Images imported into k3s containerd"
    fi
    # Generate secrets with real values
    sed \
      -e "s/__REPLACE_SECRET_KEY__/${SECRET_KEY}/g" \
      -e "s/__REPLACE_DB_PASS__/${DB_PASS}/g" \
      -e "s/__REPLACE_STRIPE_KEY__//g" \
      -e "s/__REPLACE_STRIPE_WEBHOOK__//g" \
      deploy/k8s/01-secrets.yaml > /tmp/arm-academy-secrets.yaml
    # Apply all manifests
    kubectl apply -f deploy/k8s/00-namespace.yaml
    kubectl apply -f /tmp/arm-academy-secrets.yaml
    kubectl apply -f deploy/k8s/02-configmap.yaml
    kubectl apply -f deploy/k8s/03-postgres.yaml
    kubectl apply -f deploy/k8s/04-redis.yaml
    kubectl apply -f deploy/k8s/05-media-pvc.yaml
    kubectl apply -f deploy/k8s/06-web.yaml
    kubectl apply -f deploy/k8s/07-celery.yaml
    kubectl apply -f deploy/k8s/08-frontend.yaml
    kubectl apply -f deploy/k8s/09-ingress.yaml
    rm -f /tmp/arm-academy-secrets.yaml
    log "Kubernetes manifests applied"
    echo ""
    log "Waiting for pods to start..."
    kubectl rollout status deployment/web -n arm-academy --timeout=180s || true
    kubectl get pods -n arm-academy
else
    # ── Standalone Docker Compose on port 8080 ────────────────────────────────
    warn "k3s not accessible — using Docker Compose on port 8080"
    cp .env.production .env
    # Use different external port to avoid conflicting with existing app
    sed -i 's/- "80:80"/- "8080:80"/' docker-compose.yml
    docker compose pull --quiet
    docker compose up -d --build
    log "Docker Compose started on port 8080"
    echo ""
    warn "Add to your existing Nginx/Traefik config:"
    echo "  Proxy armacademy.am → localhost:8080"
fi

# ── DONE ─────────────────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════"
echo -e "   ${GREEN}Arm Academy deployed!${NC}"
echo "══════════════════════════════════════════════"
echo ""
echo "  App directory:  $APP_DIR"
echo "  Credentials:    $APP_DIR/.env.production"
echo ""
if $USE_K3S; then
    echo "  Check status:   kubectl get pods -n arm-academy"
    echo "  View logs:      kubectl logs -n arm-academy deploy/web -f"
    echo "  Django admin:   https://armacademy.am/admin/"
else
    echo "  Check status:   docker compose ps"
    echo "  View logs:      docker compose logs -f web"
    echo "  (Running on port 8080 — configure Nginx to proxy armacademy.am)"
fi
echo ""
echo "  ⚠️  Point armacademy.am DNS → 13.61.77.153 when ready"
echo ""
