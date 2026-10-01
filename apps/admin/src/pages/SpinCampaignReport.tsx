import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, RefreshCw, Search, Disc3, Users, Gift, CheckCircle2, Clock3 } from 'lucide-react'
import { api, getToken } from '../lib/api'
import { formatDateTime, formatNumber } from '../lib/format'
import { downloadExcelCsv } from '../lib/excelExport'

interface SpinClaim {
  id: string
  code: string
  prizeId: string
  prizeLabel: string
  prizeType: string
  prizeEmoji: string
  phone: string
  deviceKey: string | null
  dayKey: string
  redeemedAt: string | null
  redeemedBy: string | null
  createdAt: string
}

interface SpinReport {
  summary: {
    totalSpins: number
    uniqueParticipants: number
    wins: number
    redeemed: number
    pending: number
    tryAgain: number
    redemptionRate: number
    spinsToday: number
  }
  byPrize: Array<{
    prizeId: string
    prizeLabel: string
    prizeType: string
    prizeEmoji: string
    count: number
  }>
  byDay: Array<{ dayKey: string; count: number }>
  participants: Array<{
    phone: string
    spinCount: number
    firstSpinAt: string | null
    lastSpinAt: string | null
    winCount: number
    redeemedCount: number
    pendingCount: number
    wins: Array<{
      prizeLabel: string
      prizeEmoji: string
      prizeType: string
      code: string
      redeemedAt: string | null
      createdAt: string
    }>
  }>
  claims: {
    total: number
    page: number
    limit: number
    items: SpinClaim[]
  }
}

const PRIZE_TYPE_LABEL: Record<string, string> = {
  FREE_ITEM: 'آیتم رایگان',
  BUY_GET_KID_FREE: 'بچه رایگان',
  DISCOUNT_ITEM: 'تخفیف محصول',
  DISCOUNT_CATEGORY: 'تخفیف دسته',
  EXTERNAL: 'جایزه خارجی',
  TRY_AGAIN: 'دوباره تلاش',
}

function statusLabel(c: SpinClaim) {
  if (c.prizeType === 'TRY_AGAIN') return 'دوباره'
  if (c.redeemedAt) return 'استفاده‌شده'
  return 'فعال'
}

export function SpinCampaignReport() {
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'claims' | 'participants' | 'prizes'>('claims')
  const [applied, setApplied] = useState({ phone: '', code: '', status: 'all', from: '', to: '' })

  const queryKey = useMemo(
    () => ['spin-report', applied, page] as const,
    [applied, page],
  )

  const { data, isFetching, refetch, isError, error } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: '40',
      })
      if (applied.phone) params.set('phone', applied.phone)
      if (applied.code) params.set('code', applied.code)
      if (applied.status !== 'all') params.set('status', applied.status)
      if (applied.from) params.set('from', applied.from)
      if (applied.to) params.set('to', applied.to)
      return api<SpinReport>(`/api/admin/spin/report?${params}`)
    },
    refetchInterval: 30_000,
  })

  const applyFilters = () => {
    setPage(1)
    setApplied({ phone, code, status, from, to })
  }

  const exportCsv = async () => {
    const params = new URLSearchParams()
    if (applied.phone) params.set('phone', applied.phone)
    if (applied.code) params.set('code', applied.code)
    if (applied.status !== 'all') params.set('status', applied.status)
    if (applied.from) params.set('from', applied.from)
    if (applied.to) params.set('to', applied.to)

    const token = getToken()
    const res = await fetch(`/api/admin/spin/export?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      // fallback: export current page from report
      if (!data) return
      downloadExcelCsv(
        `spin-campaign-${new Date().toISOString().slice(0, 10)}.csv`,
        ['کد', 'موبایل', 'جایزه', 'نوع', 'روز', 'وضعیت', 'استفاده', 'دستگاه', 'تاریخ'],
        data.claims.items.map((c) => [
          c.code,
          c.phone,
          c.prizeLabel,
          PRIZE_TYPE_LABEL[c.prizeType] ?? c.prizeType,
          c.dayKey,
          statusLabel(c),
          c.redeemedAt ? formatDateTime(c.redeemedAt) : '',
          c.deviceKey ?? '',
          formatDateTime(c.createdAt),
        ]),
      )
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spin-campaign-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const s = data?.summary
  const maxDay = Math.max(1, ...(data?.byDay.map((d) => d.count) ?? [1]))

  return (
    <div className="page">
      <header className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1>
            <Disc3 size={22} style={{ verticalAlign: 'middle', marginLeft: 8 }} />
            رصد کمپین گردونه
          </h1>
          <p className="page-sub">
            شماره‌ها، جوایز، کدها و وضعیت استفاده در صندوق · لینک مستقیم:{' '}
            <a href="https://chill-bar.ir/spin" target="_blank" rel="noreferrer" dir="ltr">
              chill-bar.ir/spin
            </a>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn-secondary" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw size={16} className={isFetching ? 'spin' : ''} /> بروزرسانی
          </button>
          <button type="button" className="btn-primary" onClick={() => void exportCsv()}>
            <Download size={16} /> خروجی اکسل
          </button>
        </div>
      </header>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="form-grid" style={{ alignItems: 'end' }}>
          <label className="field">
            <span>موبایل</span>
            <input
              dir="ltr"
              placeholder="09…"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </label>
          <label className="field">
            <span>کد</span>
            <input
              dir="ltr"
              placeholder="۸ رقم"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </label>
          <label className="field">
            <span>وضعیت</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">همه</option>
              <option value="wins">بردها (بدون دوباره)</option>
              <option value="pending">کد فعال / استفاده‌نشده</option>
              <option value="redeemed">استفاده‌شده در صندوق</option>
              <option value="try_again">دوباره تلاش کن</option>
            </select>
          </label>
          <label className="field">
            <span>از تاریخ</span>
            <input type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span>تا تاریخ</span>
            <input type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" className="btn-primary" onClick={applyFilters}>
            <Search size={16} /> اعمال فیلتر
          </button>
        </div>
      </section>

      {isError && (
        <div className="card" style={{ marginBottom: 16, color: '#c62828' }}>
          {(error as Error)?.message || 'خطا در دریافت گزارش'}
        </div>
      )}

      {s && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <StatCard icon={<Disc3 size={18} />} label="کل چرخش‌ها" value={formatNumber(s.totalSpins)} />
          <StatCard icon={<Users size={18} />} label="شرکت‌کننده یکتا" value={formatNumber(s.uniqueParticipants)} />
          <StatCard icon={<Gift size={18} />} label="برد جایزه" value={formatNumber(s.wins)} />
          <StatCard icon={<CheckCircle2 size={18} />} label="استفاده‌شده" value={formatNumber(s.redeemed)} />
          <StatCard icon={<Clock3 size={18} />} label="در انتظار صندوق" value={formatNumber(s.pending)} />
          <StatCard label="نرخ استفاده" value={`${formatNumber(s.redemptionRate)}٪`} />
          <StatCard label="امروز" value={formatNumber(s.spinsToday)} />
          <StatCard label="دوباره تلاش" value={formatNumber(s.tryAgain)} />
        </div>
      )}

      {data && data.byDay.length > 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>روند روزانه</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, minHeight: 100, overflowX: 'auto' }}>
            {data.byDay.map((d) => (
              <div key={d.dayKey} style={{ flex: '0 0 36px', textAlign: 'center' }} title={`${d.dayKey}: ${d.count}`}>
                <div
                  style={{
                    height: `${Math.max(8, (d.count / maxDay) * 80)}px`,
                    background: 'linear-gradient(180deg, #f26522, #d94e10)',
                    borderRadius: 6,
                    marginBottom: 4,
                  }}
                />
                <div style={{ fontSize: 10, opacity: 0.7 }}>{d.dayKey.slice(5)}</div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{formatNumber(d.count)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(
          [
            ['claims', 'همه رکوردها'],
            ['participants', 'شرکت‌کنندگان'],
            ['prizes', 'به تفکیک جایزه'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'claims' && data && (
        <section className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>رکوردها ({formatNumber(data.claims.total)})</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                قبلی
              </button>
              <span style={{ fontSize: 13 }}>صفحه {formatNumber(page)}</span>
              <button
                type="button"
                className="btn-secondary"
                disabled={page * data.claims.limit >= data.claims.total}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>کد</th>
                  <th>موبایل</th>
                  <th>جایزه</th>
                  <th>نوع</th>
                  <th>وضعیت</th>
                  <th>روز</th>
                  <th>تاریخ</th>
                  <th>استفاده</th>
                </tr>
              </thead>
              <tbody>
                {data.claims.items.map((c) => (
                  <tr key={c.id}>
                    <td dir="ltr"><code>{c.code}</code></td>
                    <td dir="ltr">{c.phone}</td>
                    <td>
                      {c.prizeEmoji} {c.prizeLabel}
                    </td>
                    <td>{PRIZE_TYPE_LABEL[c.prizeType] ?? c.prizeType}</td>
                    <td>{statusLabel(c)}</td>
                    <td dir="ltr">{c.dayKey}</td>
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td>{c.redeemedAt ? formatDateTime(c.redeemedAt) : '—'}</td>
                  </tr>
                ))}
                {data.claims.items.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', opacity: 0.6 }}>
                      رکوردی نیست
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'participants' && data && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>شرکت‌کنندگان ({formatNumber(data.participants.length)})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>موبایل</th>
                  <th>تعداد چرخش</th>
                  <th>برد</th>
                  <th>استفاده‌شده</th>
                  <th>در انتظار</th>
                  <th>اولین</th>
                  <th>آخرین</th>
                  <th>جوایز</th>
                </tr>
              </thead>
              <tbody>
                {data.participants.map((p) => (
                  <tr key={p.phone}>
                    <td dir="ltr"><strong>{p.phone}</strong></td>
                    <td>{formatNumber(p.spinCount)}</td>
                    <td>{formatNumber(p.winCount)}</td>
                    <td>{formatNumber(p.redeemedCount)}</td>
                    <td>{formatNumber(p.pendingCount)}</td>
                    <td>{p.firstSpinAt ? formatDateTime(p.firstSpinAt) : '—'}</td>
                    <td>{p.lastSpinAt ? formatDateTime(p.lastSpinAt) : '—'}</td>
                    <td style={{ maxWidth: 280 }}>
                      {p.wins.length === 0
                        ? '—'
                        : p.wins
                            .map(
                              (w) =>
                                `${w.prizeEmoji} ${w.prizeLabel} (${w.code}${w.redeemedAt ? '✓' : ''})`,
                            )
                            .join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'prizes' && data && (
        <section className="card">
          <h3 style={{ marginTop: 0 }}>تفکیک جوایز</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>جایزه</th>
                  <th>نوع</th>
                  <th>تعداد</th>
                  <th>سهم</th>
                </tr>
              </thead>
              <tbody>
                {data.byPrize.map((p) => {
                  const share =
                    data.summary.totalSpins > 0
                      ? Math.round((p.count / data.summary.totalSpins) * 1000) / 10
                      : 0
                  return (
                    <tr key={`${p.prizeId}-${p.prizeLabel}`}>
                      <td>
                        {p.prizeEmoji} {p.prizeLabel}
                      </td>
                      <td>{PRIZE_TYPE_LABEL[p.prizeType] ?? p.prizeType}</td>
                      <td>{formatNumber(p.count)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              borderRadius: 99,
                              background: '#eee',
                              overflow: 'hidden',
                              maxWidth: 140,
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(100, share)}%`,
                                height: '100%',
                                background: '#f26522',
                              }}
                            />
                          </div>
                          <span>{formatNumber(share)}٪</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="card" style={{ padding: '14px 16px', margin: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7, fontSize: 12 }}>
        {icon}
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  )
}
