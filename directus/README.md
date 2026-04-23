# Directus CMS: Local Development & Production Setup

## Local Development

1. Ensure Docker is installed and running.
2. From the project root, run:

```bash
cd directus
docker compose up -d
```

3. Access Directus at: http://localhost:8055
   - Admin email: it@scratchsolid.co.za
   - Admin password: admin1234
   - Change password after first login!

4. Data is stored in `directus/directus-data/` (SQLite by default).

---

## Production Deployment (Free Tier)

- Recommended: [Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io)
- Use PostgreSQL (free tier) for production DB.
- Set all secrets from `.env.example` in your host's dashboard.
- Expose Directus API endpoint (e.g., `https://your-directus.fly.dev`).
- Restrict admin access and set strong passwords.

---

## Integration

- Use `DIRECTUS_URL` and `DIRECTUS_API_TOKEN` in your frontend/backend to fetch content.
- For Cloudflare Pages/Workers, set these as environment variables in your deployment settings.

---

## Next Steps

- Define collections for all dynamic content (gallery, about, home, promos, etc.) in Directus admin.
- Seed initial content.
- Integrate Directus API in your apps.

---

## References
- https://docs.directus.io/self-hosted/docker/
- https://docs.directus.io/getting-started/introduction/
