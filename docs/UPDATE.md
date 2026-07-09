# راهنمای آپدیت Chill Bar روی سرور

برای آپدیت بعد از هر تغییر در GitHub — **۳ دستور** کافی است.

---

## آپدیت عادی (۹۹٪ مواقع)

```bash
cd /opt/chill-bar
export BUILD_SHA="$(git rev-parse --short HEAD)"
git pull
docker compose up -d --build
```

یا با اسکریپت آماده:

```bash
cd /opt/chill-bar
bash scripts/deploy-update.sh
```

صبر کن تا build تمام شود (۲–۲۰ دقیقه؛ قطع شدن SSH یعنی deploy ناقص مانده).

بررسی:

```bash
docker compose ps
docker compose logs api --tail=30
```

همه سرویس‌ها باید **Up** باشند. در پایین سایدبار ادمین باید `build <commit>` همان `git rev-parse --short HEAD` باشد.

---

## چه چیزهایی خودکار انجام می‌شود؟

| کار | زمان |
|-----|------|
| Migration دیتابیس | خودکار روی استارت API |
| Seed داده اولیه | فقط اگر منو خالی باشد؛ قیمت‌ها و گزینه‌های ادمین **بازنویسی نمی‌شوند** |
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

### تغییرات ادمین / API اعمال نشده

**علت‌های رایج:**

1. Build وسط کار قطع شده (SSH یا 1Panel) — کانتینر قدیمی هنوز Up است
2. فقط `docker compose restart` زده شده بدون `--build`
3. کش مرورگر یا پروکسی 1Panel روی `index.html`
4. تغییرات API (گزارش مالی، کد سفارش CH500، …) بدون rebuild سرویس `api`

**راه‌حل:**

```bash
cd /opt/chill-bar
git pull
git log -1 --oneline                    # آخرین commit روی سرور
bash scripts/deploy-update.sh --no-cache
```

یا دستی:

```bash
export BUILD_SHA="$(git rev-parse --short HEAD)"
docker compose build --no-cache admin api
docker compose up -d --force-recreate admin api
docker compose ps
```

بعد در مرورگر: **Ctrl+Shift+R** یا پنجره ناشناس.

تأیید نسخه: پایین سایدبار ادمین → `build abc1234` باید با `git rev-parse --short HEAD` یکی باشد.

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

### قیمت‌ها و گزینه‌های بستنی بعد از آپدیت/ری‌استارت برگشت

**علت:** در نسخه‌های قدیمی، با هر `docker compose up` اسکریپت seed دوباره اجرا می‌شد و قیمت‌ها را از فایل پیش‌فرض بازنویسی می‌کرد.

**بعد از fix:** seed فقط وقتی منو خالی باشد اجرا می‌شود؛ تغییرات ادمین حفظ می‌شوند.

**بازیابی داده از دست رفته** (اگر بکاپ دارید):

```bash
cat backup-YYYY-MM-DD.sql | docker compose exec -T postgres psql -U chillbar chillbar
```

اگر بکاپ ندارید، باید قیمت‌ها را دوباره از پنل ادمین وارد کنید.

> **نکته:** `npm run db:seed` دستی هم دیگر قیمت‌های موجود را عوض نمی‌کند — فقط آیتم‌های جدیدِ نبوده را اضافه می‌کند.

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
