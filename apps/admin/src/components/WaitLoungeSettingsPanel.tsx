import type { LoyaltyRewardTier, OrderStatus, WaitGameId, WaitLoungeSettings } from '@chill-bar/shared'
import { ORDER_STATUS_LABEL, WAIT_GAME_IDS } from '@chill-bar/shared'

const GAME_LABELS: Record<WaitGameId, string> = {
  perfectPour: 'ریتم چیل (Chill Beat)',
  memoryBrew: 'حافظه دمنوش (Memory Brew)',
  chillStack: 'برج فنجان (Chill Stack)',
  snakeGame: 'مار اصفهانی (Snake)',
}

interface Props {
  settings: WaitLoungeSettings
  onChange: (settings: WaitLoungeSettings) => void
}

function newTier(): LoyaltyRewardTier {
  return {
    id: `tier-${Date.now()}`,
    type: 'discount_fixed',
    label: 'تخفیف جدید',
    cost: 100,
    value: 5000,
    menuItemId: null,
  }
}

export function WaitLoungeSettingsPanel({ settings, onChange }: Props) {
  const set = <K extends keyof WaitLoungeSettings>(key: K, value: WaitLoungeSettings[K]) => {
    onChange({ ...settings, [key]: value })
  }

  const toggleGame = (id: WaitGameId) => {
    set('enabledGames', { ...settings.enabledGames, [id]: !settings.enabledGames[id] })
  }

  const toggleStatus = (status: OrderStatus) => {
    const next = settings.allowedStatuses.includes(status)
      ? settings.allowedStatuses.filter((s) => s !== status)
      : [...settings.allowedStatuses, status]
    set('allowedStatuses', next.length ? next : settings.allowedStatuses)
  }

  return (
    <div className="settings-grid">
      <section className="card">
        <h3>سالن انتظار — بازی‌ها</h3>
        <p className="page-sub" style={{ marginBottom: 12 }}>
          مشتری بعد از ثبت سفارش می‌تواند تا آماده شدن سفارش بازی کند و Chill Points جمع کند.
        </p>
        <div className="feature-list">
          {WAIT_GAME_IDS.map((id) => (
            <label key={id} className="feature-toggle">
              <span>{GAME_LABELS[id]}</span>
              <label className="switch">
                <input type="checkbox" checked={settings.enabledGames[id]} onChange={() => toggleGame(id)} />
                <span className="switch-track" />
              </label>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>وضعیت‌های مجاز برای بازی</h3>
        <div className="feature-list">
          {(['PENDING', 'CONFIRMED', 'PREPARING'] as OrderStatus[]).map((status) => (
            <label key={status} className="feature-toggle">
              <span>{ORDER_STATUS_LABEL[status]}</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.allowedStatuses.includes(status)}
                  onChange={() => toggleStatus(status)}
                />
                <span className="switch-track" />
              </label>
            </label>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>اقتصاد امتیاز</h3>
        <p className="page-sub" style={{ marginBottom: 12 }}>
          مشتریان در سالن انتظار امتیاز جمع می‌کنند. مصرف امتیاز را می‌توانید برای آینده غیرفعال نگه دارید.
        </p>
        <div className="feature-list" style={{ marginBottom: 16 }}>
          <label className="feature-toggle">
            <div>
              <span>مصرف امتیاز در سفارش</span>
              <p className="field-hint" style={{ marginTop: 4 }}>
                {settings.pointsRedemptionEnabled
                  ? 'مشتریان می‌توانند امتیاز را در سبد خرید مصرف کنند'
                  : 'فقط جمع‌آوری امتیاز فعال است — مصرف به‌زودی'}
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.pointsRedemptionEnabled}
                onChange={(e) => set('pointsRedemptionEnabled', e.target.checked)}
              />
              <span className="switch-track" />
            </label>
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>سقف امتیاز هر سفارش</span>
            <input
              type="number"
              min={50}
              value={settings.maxPointsPerOrder}
              onChange={(e) => set('maxPointsPerOrder', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>ضریب bonus در «در حال آماده‌سازی»</span>
            <input
              type="number"
              min={1}
              step={0.1}
              value={settings.statusBonusMultiplier}
              onChange={(e) => set('statusBonusMultiplier', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>زمان تقریبی آماده‌سازی (دقیقه)</span>
            <input
              type="number"
              min={1}
              value={settings.estimatedPrepMinutes}
              onChange={(e) => set('estimatedPrepMinutes', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>حداقل امتیاز برای استفاده</span>
            <input
              type="number"
              min={0}
              value={settings.minPointsToRedeem}
              onChange={(e) => set('minPointsToRedeem', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>حداکثر تخفیف هر سفارش (تومان)</span>
            <input
              type="number"
              min={0}
              value={settings.maxDiscountPerOrder}
              onChange={(e) => set('maxDiscountPerOrder', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>حداکثر درصد تخفیف</span>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.maxPercentPerOrder}
              onChange={(e) => set('maxPercentPerOrder', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>انقضای امتیاز (روز) — خالی = بدون انقضا</span>
            <input
              type="number"
              min={1}
              max={3650}
              value={settings.pointsExpireDays ?? ''}
              onChange={(e) =>
                set('pointsExpireDays', e.target.value ? Number(e.target.value) : null)
              }
              placeholder="بدون انقضا"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>تنظیم بازی‌ها</h3>
        <div className="form-grid">
          <label className="field">
            <span>Chill Beat — ضرب</span>
            <input
              type="number"
              min={1}
              value={settings.games.perfectPour.rounds}
              onChange={(e) =>
                onChange({
                  ...settings,
                  games: {
                    ...settings.games,
                    perfectPour: { ...settings.games.perfectPour, rounds: Number(e.target.value) },
                  },
                })
              }
            />
          </label>
          <label className="field">
            <span>Chill Beat — امتیاز عالی</span>
            <input
              type="number"
              min={1}
              value={settings.games.perfectPour.perfectPoints}
              onChange={(e) =>
                onChange({
                  ...settings,
                  games: {
                    ...settings.games,
                    perfectPour: { ...settings.games.perfectPour, perfectPoints: Number(e.target.value) },
                  },
                })
              }
            />
          </label>
          <label className="field">
            <span>Memory — جفت کارت</span>
            <input
              type="number"
              min={2}
              max={12}
              value={settings.games.memoryBrew.pairs}
              onChange={(e) =>
                onChange({
                  ...settings,
                  games: {
                    ...settings.games,
                    memoryBrew: { ...settings.games.memoryBrew, pairs: Number(e.target.value) },
                  },
                })
              }
            />
          </label>
          <label className="field">
            <span>Chill Stack — امتیاز هر بلوک</span>
            <input
              type="number"
              min={1}
              value={settings.games.chillStack.blockPoints}
              onChange={(e) =>
                onChange({
                  ...settings,
                  games: {
                    ...settings.games,
                    chillStack: { ...settings.games.chillStack, blockPoints: Number(e.target.value) },
                  },
                })
              }
            />
          </label>
          <label className="field">
            <span>Snake — امتیاز هر غذا</span>
            <input
              type="number"
              min={1}
              value={settings.games.snakeGame.pointsPerFood}
              onChange={(e) =>
                onChange({
                  ...settings,
                  games: {
                    ...settings.games,
                    snakeGame: { ...settings.games.snakeGame, pointsPerFood: Number(e.target.value) },
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="modifiers-editor-head">
          <h3>کاتالوگ پاداش‌ها</h3>
          <button type="button" className="btn-secondary btn-sm" onClick={() => set('rewards', [...settings.rewards, newTier()])}>
            + پاداش
          </button>
        </div>
        <div className="modifiers-groups" style={{ marginTop: 12 }}>
          {settings.rewards.map((tier, index) => (
            <div key={tier.id} className="modifier-group card">
              <div className="modifier-group-head">
                <input
                  className="modifier-group-name"
                  value={tier.label}
                  onChange={(e) => {
                    const rewards = [...settings.rewards]
                    rewards[index] = { ...tier, label: e.target.value }
                    set('rewards', rewards)
                  }}
                />
                <select
                  value={tier.type}
                  onChange={(e) => {
                    const rewards = [...settings.rewards]
                    rewards[index] = {
                      ...tier,
                      type: e.target.value as LoyaltyRewardTier['type'],
                    }
                    set('rewards', rewards)
                  }}
                >
                  <option value="discount_fixed">تخفیف ثابت</option>
                  <option value="discount_percent">تخفیف درصدی</option>
                  <option value="free_item">آیتم رایگان</option>
                </select>
                <button
                  type="button"
                  className="icon-btn-sm danger"
                  onClick={() => set('rewards', settings.rewards.filter((r) => r.id !== tier.id))}
                >
                  ✕
                </button>
              </div>
              <div className="modifier-option-row">
                <input
                  type="number"
                  placeholder="هزینه امتیاز"
                  value={tier.cost}
                  onChange={(e) => {
                    const rewards = [...settings.rewards]
                    rewards[index] = { ...tier, cost: Number(e.target.value) }
                    set('rewards', rewards)
                  }}
                />
                <input
                  type="number"
                  placeholder="مقدار (تومان یا %)"
                  value={tier.value}
                  onChange={(e) => {
                    const rewards = [...settings.rewards]
                    rewards[index] = { ...tier, value: Number(e.target.value) }
                    set('rewards', rewards)
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
