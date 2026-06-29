# Estado de producción — Tic Toc Pharma

> Actualizado: 2026-06-28  
> Estado: listo para primer deploy en Fly.io

---

## ✅ Implementado y listo

| # | Qué | Notas |
|---|-----|-------|
| 1 | Stripe Checkout + webhooks | `server/routes/payments.js`, `server/services/stripe.js` |
| 2 | Email transaccional (Resend) | Confirmación de pedido, cambio de estado, reset de contraseña, bienvenida |
| 3 | Logging estructurado (pino) | JSON en producción, pretty-print en dev. `server/services/logger.js` |
| 4 | Rate limiting global | 300 req/min por IP en todas las rutas `/api`. Stripe webhook exento |
| 5 | Dockerfile multi-stage | Stage builder (node:22-alpine + bcrypt + Vite) + Stage runner (non-root, dumb-init) |
| 6 | fly.toml | Region mia, release_command para migrations, volumen para uploads, health check |
| 7 | GitHub Actions CI/CD | Valida sintaxis + schemas Prisma → deploy automático en push a main |
| 8 | Schema PostgreSQL completo | 15 modelos, todas las migrations aplicadas incluyendo payment fields |
| 9 | SQLite dev sync | Migration `20260628120000_add_payment_fields` creada para paridad local |
| 10 | Reset de contraseña | Token con expiración, email de enlace, forzado en primer login |
| 11 | Auth segura | httpOnly cookie, bcrypt, roles, session purge, CSRF vía origin enforcement |
| 12 | Validación de entorno | `validateRuntimeEnvironment()` falla explícito si faltan vars en producción |

---

## ⚠️ Pendiente antes de lanzar con usuarios reales

### 1. Stripe en modo LIVE
Actualmente las claves configuradas deben ser `sk_live_...` en producción.  
- Activar cuenta Stripe con datos de negocio y datos bancarios
- Configurar webhook endpoint: `https://tictocpharma.fly.dev/api/payments/webhook`
- Eventos requeridos: `checkout.session.completed`, `checkout.session.expired`
- Poner `STRIPE_WEBHOOK_SECRET` como secret de Fly.io

### 2. Dominio personalizado
- `tictocpharma.fly.dev` funciona de inmediato
- Dominio propio: `fly certs add tudominio.com` → actualizar `FRONTEND_ORIGINS` y `PUBLIC_APP_URL`

### 3. Imágenes de productos en la nube (largo plazo)
- Actualmente: filesystem local en volumen Fly.io (funciona para un solo nodo)
- Recomendado a futuro: Cloudflare R2 o AWS S3 con URLs firmadas + CDN

### 4. Páginas legales
- Requeridas por Stripe para activar pagos en vivo: Política de Privacidad, Términos de Servicio

---

## Checklist de primer deploy en Fly.io

```bash
# 1. Instalar flyctl
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Crear la app (nombre debe ser único globalmente)
fly apps create tictocpharma

# 4. Postgres administrado
fly postgres create --name tictocpharma-db --region mia --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 10

# 5. Conectar Postgres → inyecta DATABASE_URL como secret automáticamente
fly postgres attach tictocpharma-db --app tictocpharma

# 6. Volumen para uploads
fly vol create tictocpharma_uploads --size 1 --region mia --app tictocpharma

# 7. Secrets
fly secrets set \
  SESSION_SECRET="$(openssl rand -hex 32)" \
  FRONTEND_ORIGINS="https://tictocpharma.fly.dev" \
  PUBLIC_APP_URL="https://tictocpharma.fly.dev" \
  RESEND_API_KEY="re_XXXXX" \
  EMAIL_FROM="Tic Toc Pharma <pedidos@tudominio.com>" \
  STRIPE_SECRET_KEY="sk_live_XXXXX" \
  STRIPE_WEBHOOK_SECRET="whsec_XXXXX" \
  --app tictocpharma

# 8. Primer deploy (aplica migrations automáticamente vía release_command)
fly deploy --app tictocpharma

# 9. Crear primer administrador
fly ssh console -C "node scripts/bootstrap-admin.js" --app tictocpharma

# 10. Verificar
curl https://tictocpharma.fly.dev/api/health
curl https://tictocpharma.fly.dev/api/ready
```

---

## CI/CD (después del primer deploy manual)

1. Ve a GitHub → Settings → Secrets → Actions
2. Agrega `FLY_API_TOKEN`:
   ```bash
   fly tokens create deploy -x 999999h --app tictocpharma
   ```
3. A partir de ahí cada push a `main` dispara validación + deploy automático

---

## Brechas de largo plazo (no bloquean lanzamiento)

| # | Qué | Prioridad |
|---|-----|-----------|
| 1 | Tests de integración | Media |
| 2 | Migrar imágenes a Cloudflare R2 | Media |
| 3 | Sentry para errores de aplicación | Media |
| 4 | Páginas legales (privacidad, términos) | Alta — necesaria para Stripe live |
| 5 | Multi-región Fly.io | Baja |
