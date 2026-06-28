# راهنمای استقرار Chill Bar روی 1Panel

این راهنما برای استقرار **همین الان** و **آپدیت‌های بعدی** نوشته شده است.

پروژه با **Docker Compose** بالا می‌آید و شامل ۴ سرویس است:

| سرویس | نقش | پورت داخلی |
|--------|-----|------------|
| `postgres` | دیتابیس | 5432 |
| `api` | بک‌اند Fastify + Prisma | 4000 |
| `web` | اپ مشتری (PWA) | 80 → **8080** |
| `admin` | پنل مدیریت | 80 → **8081** |

---

## پیش‌نیازها

روی سرور (VPS) باید نصب باشد:

- **1Panel** (نسخه ۲)
- **Docker** و **Docker Compose** (معمولاً از داخل 1Panel فعال می‌شود)
- حداقل **۲GB RAM** (اولین build حدود ۵–۱۵ دقیقه طول می‌کشد)
- حداقل **۱۰GB** فضای دیسک

دامنه (اختیاری ولی توصیه‌شده):

- `order.example.com` → اپ مشتری
- `admin.example.com` → پنل ادمین

---

## مرحله ۱ — انتقال کد به سرور

### روش A: Git (توصیه‌شده برای آپدیت آسان)

روی سرور:

```bash
sudo mkdir -p /opt/chill-bar
sudo chown $USER:$USER /opt/chill-bar
cd /opt/chill-bar

git clone <آدرس-ریپوی-شما> .
```

### روش B: آپلود ZIP

1. روی کامپیوتر خودتان پوشه پروژه را zip کنید (**بدون** `node_modules`)
2. در 1Panel → **فایل** → آپلود به مسیر `/opt/chill-bar`
3. Extract کنید

---

## مرحله ۲ — ساخت فایل `.env`

در ریشه پروژه (`/opt/chill-bar`):

```bash
cd /opt/chill-bar
cp .env.example .env
nano .env
```

مقادیر **حتماً** را عوض کنید:

```env
# دیتابیس
POSTGRES_USER=chillbar
POSTGRES_PASSWORD=یک-رمز-قوی-برای-دیتابیس
POSTGRES_DB=chillbar

# امنیت API — حتماً عوض کنید
JWT_SECRET=یک-رشته-تصادفی-طولانی

# ادمین اولیه (فقط بار اول seed)
SEED_ADMIN_USER=admin
SEED_ADMIN_PASSWORD=رمز-قوی-ادمین

# اگر فقط با IP و پورت کار می‌کنید:
CORS_ORIGINS=http://YOUR_SERVER_IP:8080,http://YOUR_SERVER_IP:8081

# اگر دامنه دارید (بعد از SSL هم همین http کافی است چون nginx پروکسی می‌کند):
# CORS_ORIGINS=https://order.example.com,https://admin.example.com
```

تولید `JWT_SECRET`:

```bash
openssl rand -hex 32
```

---

## مرحله ۳ — Build و اجرا

```bash
cd /opt/chill-bar
docker compose up -d --build
```

صبر کنید تا build تمام شود. وضعیت:

```bash
docker compose ps
docker compose logs -f api
```

وقتی API بالا آمد باید ببینید:

- migration اجرا شده
- seed انجام شده
- سرور روی پورت ۴۰۰۰ گوش می‌دهد

تست سریع:

```bash
curl http://127.0.0.1:4000/api/health
curl -I http://127.0.0.1:8080
curl -I http://127.0.0.1:8081
```

---

## مرحله ۴ — باز کردن پورت در فایروال

در 1Panel → **امنیت** / **فایروال** (یا `ufw`):

| پورت | کاربرد |
|------|-----|
| `8080` | اپ مشتری |
| `8081` | پنل ادمین |
| `443` | HTTPS (بعداً) |
| `80` | HTTP (بعداً) |

**پورت 4000 و 5432 را به اینترنت باز نکنید** — فقط داخل Docker استفاده می‌شوند.

بعد از تنظیم:

- مشتری: `http://IP_SERVER:8080`
- ادمین: `http://IP_SERVER:8081`
- ورود پیش‌فرض: همان `SEED_ADMIN_USER` / `SEED_ADMIN_PASSWORD`

**بلافاصله بعد از ورود رمز ادمین را عوض کنید** (کاربران در پنل).

---

## مرحله ۵ — اتصال دامنه و SSL (توصیه‌شده)

### ۵.۱ DNS

دو رکورد `A` به IP سرور:

- `order.example.com`
- `admin.example.com`

### ۵.۲ سایت در 1Panel

**سایت ۱ — اپ مشتری**

1. 1Panel → **وب‌سایت** → **ایجاد وب‌سایت**
2. نوع: **پروکسی معکوس (Reverse Proxy)**
3. دامنه: `order.example.com`
4. آدرس مقصد: `127.0.0.1:8080`
5. فعال‌سازی **HTTPS** (Let's Encrypt)

**سایت ۲ — پنل ادمین**

- دامنه: `admin.example.com`
- مقصد: `127.0.0.1:8081`
- HTTPS فعال

### ۵.۳ به‌روز CORS (در `.env`)

```env
CORS_ORIGINS=https://order.example.com,https://admin.example.com
```

سپس:

```bash
docker compose up -d api
```

> اپ و ادمین API را از همان دامنه از مسیر `/api/` می‌گیرند؛ نیازی به `VITE_API_URL` جدا نیست.

---

## مرحله ۶ — استقرار از داخل UI خود 1Panel (اختیاری)

اگر ترجیح می‌دهید از رابط 1Panel استفاده کنید:

1. **Container** → **Compose** → **Create**
2. نام: `chill-bar`
3. مسیر: `/opt/chill-bar`
4. فایل: `docker-compose.yml`
5. Environment: از فایل `.env` همان پوشه خوانده می‌شود
6. **Confirm** / **Deploy**

---

## آپدیت بعدی (ساده)

هر بار که کد جدید دارید:

```bash
cd /opt/chill-bar
git pull                    # اگر با Git کار می‌کنید
docker compose up -d --build
```

فقط همین. migration خودکار روی استارت API اجرا می‌شود.

بررسی لاگ:

```bash
docker compose logs -f api --tail=100
```

---

## پشتیبان‌گیری (مهم)

### دیتابیس

```bash
docker compose exec postgres pg_dump -U chillbar chillbar > backup-$(date +%F).sql
```

بازگردانی:

```bash
cat backup-2026-06-28.sql | docker compose exec -T postgres psql -U chillbar chillbar
```

### تصاویر آپلود شده

در volume با نام `chillbar_uploads` ذخیره می‌شوند. برای بکاپ:

```bash
docker run --rm -v chill-bar_chillbar_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads-backup.tar.gz -C /data .
```

---

## عیب‌یابی

| مشکل | کار |
|------|-----|
| `api` بالا نمی‌آید | `docker compose logs api` — معمولاً `DATABASE_URL` یا رمز Postgres |
| صفحه سفید web/admin | `docker compose logs web` — build شکست خورده؟ دوباره `--build` |
| عکس منو لود نمی‌شود | مطمئن شوید nginx `/uploads/` را پروکسی می‌کند (در نسخه فعلی پروژه هست) |
| WebSocket ادمین قطع | در پروکسی 1Panel **WebSocket** را فعال کنید |
| بعد از آپدیت منو خالی | seed فقط داده اولیه است؛ داده واقعی در Postgres است — بکاپ بگیرید |

ری‌استارت کامل:

```bash
docker compose down
docker compose up -d --build
```

> **هشدار:** `docker compose down -v` volume دیتابیس را پاک می‌کند — استفاده نکنید مگر عمداً.

---

## چک‌لیست نهایی قبل از تحویل

- [ ] `.env` با `JWT_SECRET` و رمزهای قوی
- [ ] `docker compose ps` — هر ۴ سرویس `running`
- [ ] اپ مشتری باز می‌شود و منو لود می‌شود
- [ ] ورود ادمین و داشبورد سفارش‌ها
- [ ] ثبت یک سفارش تست
- [ ] SSL روی دامنه (اگر دارید)
- [ ] رمز ادمین پیش‌فرض عوض شده
- [ ] یک بکاپ از دیتابیس گرفته شده

---

## خلاصه دستورات

```bash
# نصب اول
cd /opt/chill-bar && cp .env.example .env && nano .env
docker compose up -d --build

# آپدیت
cd /opt/chill-bar && git pull && docker compose up -d --build

# وضعیت
docker compose ps
docker compose logs -f api
```
