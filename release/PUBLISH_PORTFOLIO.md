# Publish `public-portfolio` at `miidea.top`

`miidea.top` keeps the TarotAI backend and admin application. Nginx serves the
explicit approved portfolio allowlist first; all other routes retain their
existing TarotAI behavior.

| Route | Owner |
| --- | --- |
| `/`, `/index.html`, `/articles/*`, `/projects/*`, `/resume*.html`, CSS and JS | approved `public-portfolio` assets |
| `/admin/*` | TarotAI Next.js admin |
| `/api/*`, `/static/*`, `/health` | TarotAI FastAPI |
| `/verify-email`, `/privacy`, `/client-portal` | TarotAI compatibility routes |

## Verified ECS layout

The current production host is a ZIP/file deployment, not a Git checkout:

```bash
/srv/my-tarot                         # existing TarotAI Compose deployment
~/public-portfolio-src                # private portfolio Git checkout
/srv/my-tarot/deploy/portal           # Nginx bind-mounted public directory
```

Do not clone or overwrite TarotAI into `/srv/my-tarot`: it contains the running
configuration, production environment file, persistent data, certificates and
application assets. Do not mount the portfolio source checkout as a web root.

## One-time preparation

The ECS SSH key must have read access to both private GitHub repositories.
Install the reviewed deployment script from the TarotAI deployment branch:

```bash
UPDATE_TMP=$(mktemp -d)
git clone --branch biiinnn20251126 --single-branch \
  git@github.com:bin448482/tarotAI.git \
  "$UPDATE_TMP/tarotAI"
sudo install -m 755 \
  "$UPDATE_TMP/tarotAI/release/publish_portfolio.py" \
  /srv/my-tarot/release/publish_portfolio.py
```

Create the portfolio source checkout once, in the deploy user's home directory:

```bash
git clone --branch master --single-branch \
  git@github.com:bin448482/public-portfolio.git \
  ~/public-portfolio-src
```

The script publishes exactly the approved HTML, CSS and JS allowlist. It
preserves the `deploy/portal` directory itself, because Docker bind mounts that
directory inode; it never publishes `docs/`, Git metadata or governance files.

## Subsequent updates

```bash
git -C ~/public-portfolio-src pull --ff-only

sudo python3 /srv/my-tarot/release/publish_portfolio.py \
  --source ~/public-portfolio-src \
  --destination /srv/my-tarot/deploy/portal \
  --check

sudo python3 /srv/my-tarot/release/publish_portfolio.py \
  --source ~/public-portfolio-src \
  --destination /srv/my-tarot/deploy/portal
```

No Nginx reload or container recreation is needed for a content-only update.
If an Nginx configuration file changed, first run `nginx -t`, then reload the
existing Nginx container.

## Required verification

```bash
curl -kfsSI https://www.miidea.top/
curl -kfsSI https://www.miidea.top/articles/index.html
curl -kfsSI https://www.miidea.top/projects/index.html
curl -kfsSI https://www.miidea.top/resume.html
curl -kfsSI https://www.miidea.top/admin/
curl -kfsS https://www.miidea.top/health
```

Also inspect the portfolio home, article index, project index and both resume
entry points in a browser. The public pages must return `200`; `/admin/` may
return a normal `308` redirect to `/admin`; `/health` must be called with GET,
not `curl -I`, because the backend does not allow HEAD. A failed `--check` is a
publication stop: remediate the source content instead of bypassing the
allowlist or scanner.

## Nginx route changes

For a portfolio content-only update, do not reload or recreate Nginx. If
`deploy/nginx/nginx.conf` changes, overwrite the reviewed configuration with
`cp` (do not use `install`, which replaces a file inode held by Docker's bind
mount), then validate and reload only Nginx:

```bash
sudo cp /path/to/reviewed/nginx.conf /srv/my-tarot/deploy/nginx/nginx.conf
sudo docker exec my-tarot-nginx-1 nginx -t
sudo docker exec my-tarot-nginx-1 nginx -s reload
```

Never run `docker compose up -d --build` for a portfolio-only release. The
TarotAI `admin` and `backend` services are not part of this update.

## Certificate renewal

The existing certificate files are persisted under
`/srv/my-tarot/deploy/certbot/conf`. Test renewal without issuing a new
certificate:

```bash
cd /srv/my-tarot
sudo docker compose -f docker-compose.prod.yml run --rm certbot \
  renew --webroot -w /var/www/certbot --dry-run
```

The portfolio source review is the authority for content approval. The script
still rejects secrets, unapproved email addresses, mainland-China phone
numbers, local paths and local-file URLs; do not remove those checks to make a
release succeed.
