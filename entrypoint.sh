#!/bin/bash
set -e

# Wait for PostgreSQL when using it
if [[ "${DATABASE_URL}" == postgres* ]]; then
    echo "Waiting for PostgreSQL..."
    until pg_isready -h "${DB_HOST:-db}" -U "${POSTGRES_USER:-arm_user}" -q 2>/dev/null; do
        sleep 1
    done
    echo "PostgreSQL is ready."
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput --clear

exec "$@"
