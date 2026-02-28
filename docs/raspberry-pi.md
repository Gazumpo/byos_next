# Deploy to Raspberry Pi (Production)

These instructions assume a Raspberry Pi running a **64-bit** OS (arm64) and that you want to run BYOS Next.js + Postgres via Docker Compose.

## 1) Confirm OS + update

On the Pi:

```bash
uname -m
```

- You want `aarch64` (64-bit). If you see `armv7l`, reinstall a 64-bit OS (Raspberry Pi OS 64-bit / Ubuntu Server arm64).

Update packages:

```bash
sudo apt update && sudo apt -y full-upgrade
sudo reboot
```

## 2) Install Docker + Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

docker --version
docker compose version
```

## 3) Get the repo onto the Pi

Option A (git):

```bash
git clone <your-repo-url> byos_next
cd byos_next
```

Option B (copy from your Mac; run from your Mac):

```bash
rsync -av --delete \
  --exclude node_modules --exclude .next --exclude .git \
  /Users/graeme/Projects/BYOS_next/ pi@<pi-ip>:~/byos_next/
```

Then on the Pi:

```bash
cd ~/byos_next
```

## 4) Configure environment variables

Create/edit `.env` on the Pi:

```bash
nano .env
```

Minimum recommended:

```bash
POSTGRES_PASSWORD=change_me
BETTER_AUTH_SECRET=change_me
BYOS_PORT=3001
BETTER_AUTH_URL=http://<pi-ip>:3001
```

Optional:

```bash
# Set this to the email you want to auto-grant the admin role on first signup.
ADMIN_EMAIL=you@example.com

# Disable auth entirely (useful on a trusted LAN).
AUTH_ENABLED=false

```

Generate a strong secret (run on the Pi):

```bash
openssl rand -base64 48
```

## 5) Start production containers

Use the main compose file plus the Pi override:

```bash
docker compose -f docker-compose.yml -f docker-compose.pi.yml up -d --build
docker compose logs -f
```

Open:

- `http://<pi-ip>:3000`

## 6) Notes: database + migrations

- Postgres data persists in the named Docker volume `postgres_data`.
- SQL files in `migrations/` run **only when the database is first created** (i.e., when the volume is empty). If you change migrations later, apply them manually.

## 7) Updating

From the repo directory on the Pi:

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.pi.yml up -d --build
docker image prune -f
```

## 8) Backups (quick)

```bash
docker compose exec -T postgres pg_dump -U postgres byos_db > byos_db_$(date +%F).sql
```

## Troubleshooting

- **Build fails on Pi (native deps like `sharp` / `@takumi-rs/*`):** paste the failing log; the usual fix is switching the Docker base image off Alpine or adding build tool packages.
- **Can’t reach from LAN:** verify the container is listening: `curl -I http://localhost:3000` on the Pi, then check firewall/router.
- **Auth redirects are wrong:** ensure `BETTER_AUTH_URL` matches what your browser uses (IP vs hostname vs https domain).
- **Better Auth says “Invalid origin”:** your browser URL and `BETTER_AUTH_URL` don’t match exactly. Set `BETTER_AUTH_URL` to the exact origin you use (scheme + host + port), then `docker compose up -d --force-recreate`.
