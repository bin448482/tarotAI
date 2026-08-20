# Publish `public-portfolio` at `miidea.top`

`miidea.top` keeps the TarotAI backend and admin application. Nginx serves the
approved portfolio assets first, then sends routes without a matching static
asset to the existing Next.js admin service.

| Route | Owner |
| --- | --- |
| `/`, `/articles/*`, `/projects/*`, `/resume*.html`, CSS and JS | approved `public-portfolio` assets |
| `/admin/*` | TarotAI Next.js admin |
| `/api/*`, `/static/*`, `/health` | TarotAI FastAPI |
| `/verify-email`, `/privacy`, `/client-portal` | TarotAI compatibility routes |

## First server setup

The server must already be authorized to read the private portfolio repository.
Clone it outside the Nginx document root:

```bash
git clone git@github.com:bin448482/public-portfolio.git /srv/public-portfolio-src
cd /srv/my-tarot
python3 release/publish_portfolio.py \
  --source /srv/public-portfolio-src \
  --destination /srv/my-tarot/deploy/portal \
  --check
python3 release/publish_portfolio.py \
  --source /srv/public-portfolio-src \
  --destination /srv/my-tarot/deploy/portal
docker compose -f docker-compose.prod.yml up -d nginx
```

Before the first reload, the updated `deploy/nginx/nginx.conf` and
`deploy/nginx/nginx.http.conf` must be present on the server. Do not publish
the source checkout directly: the script permits only the listed HTML, CSS and
JS assets, then atomically replaces `deploy/portal`.

## Subsequent updates

```bash
git -C /srv/public-portfolio-src pull --ff-only
cd /srv/my-tarot
python3 release/publish_portfolio.py \
  --source /srv/public-portfolio-src \
  --destination /srv/my-tarot/deploy/portal \
  --check
python3 release/publish_portfolio.py \
  --source /srv/public-portfolio-src \
  --destination /srv/my-tarot/deploy/portal
docker compose -f docker-compose.prod.yml up -d nginx
```

## Required verification

```bash
curl -fsSI https://www.miidea.top/
curl -fsSI https://www.miidea.top/articles/
curl -fsSI https://www.miidea.top/projects/
curl -fsSI https://www.miidea.top/resume.html
curl -fsSI https://www.miidea.top/admin/
curl -fsSI https://www.miidea.top/health
```

Also inspect the portfolio home, article index, project index and both resume
entry points in a browser. A failed `--check` is a publication stop: remediate
the source content instead of bypassing the allowlist or scanner.

The portfolio source review is the authority for content approval. The script
still rejects secrets, unapproved email addresses, mainland-China phone
numbers, local paths and local-file URLs; do not remove those checks to make a
release succeed.
