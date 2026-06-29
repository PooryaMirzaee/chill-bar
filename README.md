# Chill Bar — منوی دیجیتال هوشمند + پنل مدیریت

سامانه کامل سفارش‌گیری کافه Chill Bar شامل اپ مشتری (PWA + کیوسک تاچ)، بک‌اند کامل، و پنل مدیریت با قابلیت‌های زنده.

## معماری

مونوریپو مبتنی بر **npm workspaces**:

```
chill-bar/
├── apps/
│   ├── web/        # اپ مشتری: React 19 + Vite + PWA + Three.js (موبایل و کیوسک)
│   └── admin/      # پنل مدیریت: React + Vite + TanStack Query + Recharts
├── packages/
│   ├── api/        # بک‌اند: Fastify 5 + Prisma + PostgreSQL + JWT + WebSocket
│   └── shared/     # تایپ‌ها و اعتبارسنجی مشترک (Zod)
├── docker-compose.yml         # استقرار کامل پروداکشن
└── docker-compose.dev.yml     # فقط دیتابیس برای توسعه
```

جریان سفارش:

```
مشتری (موبایل) ─┐
                ├─→ API (Fastify) ─→ PostgreSQL
کیوسک تاچ ──────┘        │
                         └─ WebSocket ─→ پنل مدیریت (اعلان زنده + صدا)
```

## استقرار پروداکشن (Docker)

```bash
cp .env.example .env   # رمزها و CORS را تنظیم کنید
docker compose up -d --build
```

- مشتری: پورت `8080` (یا Reverse Proxy روی 80/443)
- ادمین: پورت `8081`
- API: فقط `127.0.0.1:4000` (از طریق nginx پروکسی می‌شود)

راهنماها:
- [docs/DEPLOY-1PANEL.md](docs/DEPLOY-1PANEL.md) — نصب اول روی 1Panel
- [docs/UPDATE.md](docs/UPDATE.md) — آپدیت بعدی روی سرور

## راه‌اندازی توسعه (Local)

پیش‌نیاز: Node 22+، Docker

```bash
# ۱) نصب وابستگی‌ها
npm install

# ۲) راه‌اندازی دیتابیس (PostgreSQL روی پورت 5433)
docker compose -f docker-compose.dev.yml up -d

# ۳) تنظیم env بک‌اند
cp .env.example packages/api/.env   # در صورت نیاز مقادیر را ویرایش کنید

# ۴) ساخت اسکیما و داده اولیه (منو + گزینه‌های بستنی + کاربر ادمین)
npm run db:migrate
npm run db:seed

# ۵) اجرای سرویس‌ها (در سه ترمینال یا با & )
npm run dev:api      # http://localhost:4000
npm run dev:web      # http://localhost:5173
npm run dev:admin    # http://localhost:5174
```

ورود پنل ادمین (پیش‌فرض): `admin` / `chillbar123`

### حالت کیوسک

اپ مشتری را با `?mode=kiosk` باز کنید تا حالت کیوسک تاچ فعال شود (تمام‌صفحه، دکمه‌های بزرگ، اسکرین‌سیور در بی‌کاری). برای خروج `?mode=app`.

## استقرار پروداکشن (Docker)

```bash
cp .env.example .env   # مقادیر امن تولید را تنظیم کنید (JWT_SECRET و ...)
docker compose up -d --build
```

| سرویس | آدرس |
|-------|------|
| اپ مشتری | http://localhost:8080 |
| پنل مدیریت | http://localhost:8081 |
| API | http://localhost:4000 |

سرویس `api` هنگام بالا آمدن به‌صورت خودکار migration و seed را اجرا می‌کند.

## API (خلاصه)

عمومی:
- `GET /api/health` — سلامت سرویس
- `GET /api/menu` — دسته‌ها و آیتم‌ها
- `GET /api/ice-cream/options` — گزینه‌های بستنی سفارشی
- `GET /api/settings` — تنظیمات فروشگاه
- `POST /api/orders` — ثبت سفارش
- `GET /api/orders/:id/status` — پیگیری وضعیت سفارش

احراز هویت:
- `POST /api/auth/login` · `GET /api/auth/me`

ادمین (نیازمند توکن):
- `GET/PATCH /api/admin/orders` — مدیریت سفارش‌ها
- `GET/POST/PUT/DELETE /api/admin/categories` · `/api/admin/items`
- `GET /api/admin/dashboard` — آمار و آنالیتیکس
- `PUT /api/admin/settings` — تنظیمات
- `GET/POST/PUT/DELETE /api/admin/users` — کاربران (فقط مدیر کل)

Realtime:
- `WS /ws/admin` — اعلان سفارش جدید/تغییر وضعیت برای پنل
- `WS /ws/orders` — تغییر وضعیت برای مشتری

## امکانات پنل مدیریت

- داشبورد: سفارش‌ها/درآمد امروز، نمودار ۷ روزه، ساعات پیک، پرفروش‌ها
- مدیریت سفارش‌ها به‌صورت کانبان زنده با اعلان صوتی و چاپ رسید
- مدیریت کامل منو (CRUD، موجودی، تصویر)، گزینه‌های بستنی
- تنظیمات فروشگاه و فعال/غیرفعال‌سازی قابلیت‌های اپ
- مدیریت کاربران با نقش‌ها (مدیر کل / مدیر / کارمند)

## نکات فنی

- مدل سه‌بعدی بستنی به‌صورت **پروسیجرال** رندر می‌شود (بدون دانلود سنگین) و در صورت نبود WebGL، fallback نمایش داده می‌شود.
- منوی اپ مشتری از API بارگذاری می‌شود و در صورت قطع شبکه از نسخه bundle‌شده استفاده می‌کند (PWA offline).
- سبد خرید در `localStorage` حفظ می‌شود.
