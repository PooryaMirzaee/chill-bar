# راهنمای آپدیت Chill Bar روی سرور

برای آپدیت بعد از هر تغییر در GitHub — **۳ دستور** کافی است.

---

## آپدیت عادی (۹۹٪ مواقع)

```bash
cd /opt/chill-bar
git pull
docker compose up -d --build
```

صبر کن تا build تمام شود (۲–۱۰ دقیقه).

بررسی:

```bash
docker compose ps
docker compose logs api --tail=30
```

همه سرویس‌ها باید **Up** باشند.

---

## چه چیزهایی خودکار انجام می‌شود؟

| کار | زمان |
|-----|------|
| Migration دیتابیس | خودکار روی استارت API |
| Seed داده اولیه | فقط اگر جدول خالی باشد؛ داده‌های موجود پاک نمی‌شوند |
| Build وب و ادمین | در Docker |
| رمز ادمین موجود | **عوض نمی‌شود** (seed فقط بار اول) |

---

## قبل از آپدیت (توصیه)

### بکاپ سریع دیتابیس

```bash
cd /opt/chill-bar
docker compose exec postgres pg_dump -U chillbar chillbar > backup-$(date +%F-%H%M).sql
```

### بکاپ تصاویر آپلود شده

```bash
docker run --rm -v chill-bar_chillbar_uploads:/data -v $(pwd):/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

---

## اگر `.env` تغییر کرده

بعد از `git pull` اگر `.env.example` فیلد جدید دارد:

```bash
diff .env.example .env   # ببین چه متغیری اضافه شده
nano .env                # مقادیر جدید را اضافه کن
docker compose up -d api  # فقط API را ری‌استارت کن
```

**فایل `.env` با git pull عوض نمی‌شود** — تنظیمات سرور حفظ می‌ماند.

---

## آپدیت فقط یک سرویس (سریع‌تر)

```bash
# فقط API
docker compose up -d --build api

# فقط اپ مشتری
docker compose up -d --build web

# فقط پنل ادمین
docker compose up -d --build admin
```

---

## بعد از آپدیت — تست

| تست | آدرس |
|-----|------|
| سلامت API | `curl https://chill-bar.ir/api/health` |
| منو مشتری | `https://chill-bar.ir` |
| پنل ادمین | `https://admin.chill-bar.ir` |
| یک سفارش تست | از اپ مشتری |

---

## عیب‌یابی آپدیت

### Build شکست خورد

```bash
docker compose logs api --tail=50
docker compose logs web --tail=50
docker compose logs admin --tail=50
```

دوباره:

```bash
docker compose up -d --build
```

### خطای `binaries.prisma.sh` / `EAI_AGAIN` هنگام build

موقع `prisma generate` داخل Docker، سرور باید به `binaries.prisma.sh` وصل شود. اگر DNS لحظه‌ای قطع باشد build می‌افتد؛ **کد قدیمی همچنان Up می‌ماند** تا build موفق شود.

```bash
# تست DNS از خود سرور
ping -c 2 binaries.prisma.sh

# دوباره build (معمولاً بار دوم درست می‌شود)
docker compose up -d --build
```

اگر چند بار پشت‌سرهم شکست خورد، DNS را در `/etc/resolv.conf` موقتاً عوض کن (مثلاً `nameserver 8.8.8.8`) یا از VPN/شبکه پایدارتر build بگیر.

```bash
docker compose build --no-cache api
docker compose up -d
```

### admin در حلقه Restarting

```bash
docker compose logs admin --tail=20
```

معمولاً خطای nginx config است. بعد از `git pull` دوباره build کن.

### CORS error در مرورگر

`.env` را چک کن:

```env
CORS_ORIGINS=https://chill-bar.ir,https://www.chill-bar.ir,https://admin.chill-bar.ir
```

```bash
docker compose up -d api
```

### دیتابیس خراب شد — بازگردانی بکاپ

```bash
cat backup-2026-06-28.sql | docker compose exec -T postgres psql -U chillbar chillbar
```

---

## ری‌استارت بدون آپدیت کد

```bash
docker compose restart
```

ری‌استارت کامل:

```bash
docker compose down
docker compose up -d
```

> **هشدار:** `docker compose down -v` volume دیتابیس را پاک می‌کند — استفاده نکن.

---

## خلاصه یک خطی

```bash
cd /opt/chill-bar && git pull && docker compose up -d --build && docker compose ps
```
