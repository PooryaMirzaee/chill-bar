import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Download,
  RefreshCw,
  Search,
  Wallet,
  Bike,
  FileText,
  BarChart3,
  Upload,
  Ticket,
} from 'lucide-react'
import { api, getToken } from '../lib/api'
import { formatNumber, formatPrice } from '../lib/format'
import { MallUnitTicketModal } from '../components/MallUnitTicketModal'
import type { MallTicketInput } from '../lib/mallTicket'

type Tab = 'units' | 'memberships' | 'deliveries' | 'invoices' | 'report'

interface UnitRow {
  id: string
  unitCode: string
  name: string
  floor: string | null
  category: string | null
  contactName?: string | null
  contactPhone?: string | null
  isActive: boolean
  deliveryLabel: string
  membership: {
    id: string
    code: string
    status: string
    discountPercent: number
    walletBalance: number
    creditLimit: number
    creditUsed: number
    contactPhone?: string | null
  } | null
}

interface MembershipRow {
  id: string
  code: string
  status: string
  discountPercent: number
  walletBalance: number
  creditLimit: number
  creditUsed: number
  creditAvailable: number
  contactName?: string | null
  unit: {
    id: string
    unitCode: string
    name: string
    floor: string | null
    deliveryLabel: string
    contactPhone?: string | null
  }
}

type TicketTarget = MallTicketInput & { contactPhone?: string | null }

interface DeliveryRow {
  id: string
  code: string
  total: number
  status: string
  deliveryStatus: string
  deliveryLabel: string | null
  customerName: string | null
  unitCode: string | null
  createdAt: string
}

const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: 'units', label: 'واحدها', icon: Building2 },
  { id: 'memberships', label: 'عضویت و کیف', icon: Wallet },
  { id: 'deliveries', label: 'صف پیک', icon: Bike },
  { id: 'invoices', label: 'فاکتورها', icon: FileText },
  { id: 'report', label: 'گزارش', icon: BarChart3 },
]

export function MallClub() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('units')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [selectedMembership, setSelectedMembership] = useState<MembershipRow | null>(null)
  const [topupAmount, setTopupAmount] = useState('1000000')
  const [creditLimit, setCreditLimit] = useState('')
  const [discount, setDiscount] = useState('')
  const [msg, setMsg] = useState('')
  const [ticketTarget, setTicketTarget] = useState<TicketTarget | null>(null)

  const openTicket = (t: TicketTarget) => setTicketTarget(t)

  const summary = useQuery({
    queryKey: ['mall-summary'],
    queryFn: () =>
      api<{
        units: number
        memberships: number
        activeMemberships: number
        totalWallet: number
        totalCreditUsed: number
        openDeliveries: number
      }>('/api/admin/mall/summary'),
  })

  const units = useQuery({
    queryKey: ['mall-units', search],
    queryFn: () =>
      api<{ items: UnitRow[]; total: number }>(
        `/api/admin/mall/units?limit=60&q=${encodeURIComponent(search)}`,
      ),
    enabled: tab === 'units',
  })

  const memberships = useQuery({
    queryKey: ['mall-memberships', search],
    queryFn: () =>
      api<{ items: MembershipRow[]; total: number }>(
        `/api/admin/mall/memberships?limit=60&q=${encodeURIComponent(search)}`,
      ),
    enabled: tab === 'memberships',
  })

  const deliveries = useQuery({
    queryKey: ['mall-deliveries'],
    queryFn: () => api<{ items: DeliveryRow[] }>('/api/admin/mall/deliveries'),
    enabled: tab === 'deliveries',
    refetchInterval: 12_000,
  })

  const invoices = useQuery({
    queryKey: ['mall-invoices'],
    queryFn: () =>
      api<{
        items: Array<{
          id: string
          periodKey: string
          status: string
          totalAmount: number
          unitCode: string
          unitName: string
          membershipCode: string
        }>
      }>('/api/admin/mall/invoices'),
    enabled: tab === 'invoices',
  })

  const report = useQuery({
    queryKey: ['mall-report'],
    queryFn: () =>
      api<{
        days: number
        orderCount: number
        revenue: number
        deliveryCount: number
        ranking: Array<{
          unitCode: string
          name: string
          floor: string | null
          orders: number
          total: number
          deliveries: number
        }>
      }>('/api/admin/mall/report?days=7'),
    enabled: tab === 'report',
  })

  const importMutation = useMutation({
    mutationFn: () =>
      api<{ created?: number; updated?: number; membershipsCreated?: number }>(
        '/api/admin/mall/import-seed',
        { method: 'POST', body: '{}' },
      ),
    onSuccess: (data) => {
      setMsg(
        `ایمپورت شد: ${data.created ?? 0} واحد جدید، ${data.updated ?? 0} بروزرسانی، ${data.membershipsCreated ?? 0} عضویت`,
      )
      qc.invalidateQueries({ queryKey: ['mall-summary'] })
      qc.invalidateQueries({ queryKey: ['mall-units'] })
      qc.invalidateQueries({ queryKey: ['mall-memberships'] })
    },
    onError: (e: Error) => setMsg(e.message),
  })

  const topupMutation = useMutation({
    mutationFn: () =>
      api(`/api/admin/mall/memberships/${selectedMembership!.id}/topup`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(topupAmount) || 0,
          packageId: Number(topupAmount) === 1_000_000 ? 'pack-1m' : undefined,
          bonusPercent: Number(topupAmount) === 1_000_000 ? 10 : 0,
        }),
      }),
    onSuccess: () => {
      setMsg('کیف‌پول شارژ شد')
      qc.invalidateQueries({ queryKey: ['mall-memberships'] })
      qc.invalidateQueries({ queryKey: ['mall-summary'] })
    },
    onError: (e: Error) => setMsg(e.message),
  })

  const patchMembership = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/api/admin/mall/memberships/${selectedMembership!.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      setMsg('ذخیره شد')
      qc.invalidateQueries({ queryKey: ['mall-memberships'] })
    },
    onError: (e: Error) => setMsg(e.message),
  })

  const regenCode = useMutation({
    mutationFn: () =>
      api<MembershipRow>(`/api/admin/mall/memberships/${selectedMembership!.id}/regenerate-code`, {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: (m) => {
      setSelectedMembership(m)
      setMsg(`کد جدید: ${m.code}`)
      qc.invalidateQueries({ queryKey: ['mall-memberships'] })
    },
  })

  const deliveryMutation = useMutation({
    mutationFn: ({ id, deliveryStatus }: { id: string; deliveryStatus: string }) =>
      api(`/api/admin/mall/orders/${id}/delivery-status`, {
        method: 'PATCH',
        body: JSON.stringify({ deliveryStatus }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mall-deliveries'] }),
  })

  const genInvoices = useMutation({
    mutationFn: () =>
      api<{ periodKey: string; created: number }>('/api/admin/mall/invoices/generate', {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: (d) => {
      setMsg(`فاکتور ${d.periodKey}: ${d.created} مورد`)
      qc.invalidateQueries({ queryKey: ['mall-invoices'] })
    },
  })

  const payInvoice = useMutation({
    mutationFn: (id: string) =>
      api(`/api/admin/mall/invoices/${id}/pay`, { method: 'POST', body: '{}' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mall-invoices'] }),
  })

  const deepLink = (code: string) => `https://chill-bar.ir/m/${code}`

  const stats = useMemo(() => summary.data, [summary.data])

  return (
    <div className="page">
      {ticketTarget && (
        <MallUnitTicketModal open onClose={() => setTicketTarget(null)} ticket={ticketTarget} />
      )}
      <div className="page-head">
        <div>
          <h1>اشتراک سیتی‌سنتر</h1>
          <p className="page-sub">واحدها، کد اشتراک، پاس واتساپ، کیف‌پول، اعتبار و پیک تا واحد</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
          >
            <Upload size={16} /> ایمپورت واحدها
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              const res = await fetch('/api/admin/mall/memberships/export.csv', {
                headers: { Authorization: `Bearer ${getToken() ?? ''}` },
              })
              if (!res.ok) {
                setMsg('خروجی CSV ناموفق بود')
                return
              }
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'city-center-memberships.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            <Download size={16} /> خروجی CSV / QR لینک
          </button>
        </div>
      </div>

      {msg && (
        <div className="card" style={{ marginBottom: 12, padding: 12 }}>
          {msg}
        </div>
      )}

      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginBottom: 16,
          }}
        >
          <Stat label="واحدها" value={formatNumber(stats.units)} />
          <Stat label="عضویت فعال" value={formatNumber(stats.activeMemberships)} />
          <Stat label="جمع کیف‌پول" value={formatPrice(stats.totalWallet)} />
          <Stat label="اعتبار باز" value={formatPrice(stats.totalCreditUsed)} />
          <Stat label="پیک باز" value={formatNumber(stats.openDeliveries)} />
        </div>
      )}

      <div className="settings-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {(tab === 'units' || tab === 'memberships') && (
        <form
          className="card"
          style={{ display: 'flex', gap: 8, marginBottom: 12, padding: 12 }}
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(q.trim())
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو کد واحد / نام / کد اشتراک"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary">
            <Search size={16} /> جستجو
          </button>
        </form>
      )}

      {tab === 'units' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>کد</th>
                <th>نام</th>
                <th>طبقه</th>
                <th>کد اشتراک</th>
                <th>کیف</th>
                <th>اعتبار</th>
                <th>پاس</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(units.data?.items ?? []).map((u) => (
                <tr key={u.id}>
                  <td dir="ltr">{u.unitCode}</td>
                  <td>{u.name}</td>
                  <td>{u.floor ?? '—'}</td>
                  <td dir="ltr">
                    <code>{u.membership?.code ?? '—'}</code>
                  </td>
                  <td>{u.membership ? formatPrice(u.membership.walletBalance) : '—'}</td>
                  <td>
                    {u.membership
                      ? `${formatPrice(u.membership.creditUsed)} / ${formatPrice(u.membership.creditLimit)}`
                      : '—'}
                  </td>
                  <td>
                    {u.membership && (
                      <button
                        type="button"
                        className="btn-primary"
                        title="پاس واتساپ"
                        onClick={() =>
                          openTicket({
                            unitCode: u.unitCode,
                            unitName: u.name,
                            floor: u.floor,
                            membershipCode: u.membership!.code,
                            discountPercent: u.membership!.discountPercent,
                            deepLink: deepLink(u.membership!.code),
                            contactName: u.contactName,
                            contactPhone: u.contactPhone ?? u.membership!.contactPhone,
                          })
                        }
                      >
                        <Ticket size={14} /> پاس
                      </button>
                    )}
                  </td>
                  <td>
                    {u.membership && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setTab('memberships')
                          setSelectedMembership({
                            id: u.membership!.id,
                            code: u.membership!.code,
                            status: u.membership!.status,
                            discountPercent: u.membership!.discountPercent,
                            walletBalance: u.membership!.walletBalance,
                            creditLimit: u.membership!.creditLimit,
                            creditUsed: u.membership!.creditUsed,
                            creditAvailable: u.membership!.creditLimit - u.membership!.creditUsed,
                            contactName: u.contactName,
                            unit: {
                              id: u.id,
                              unitCode: u.unitCode,
                              name: u.name,
                              floor: u.floor,
                              deliveryLabel: u.deliveryLabel,
                              contactPhone: u.contactPhone,
                            },
                          })
                          setCreditLimit(String(u.membership!.creditLimit))
                          setDiscount(String(u.membership!.discountPercent))
                        }}
                      >
                        مدیریت
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!units.data?.items.length && <p className="page-sub">واحدی نیست — ایمپورت را بزنید.</p>}
        </div>
      )}

      {tab === 'memberships' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 12,
          }}
        >
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>واحد</th>
                  <th>کد</th>
                  <th>تخفیف</th>
                  <th>کیف</th>
                  <th>اعتبار آزاد</th>
                </tr>
              </thead>
              <tbody>
                {(memberships.data?.items ?? []).map((m) => (
                  <tr
                    key={m.id}
                    style={{
                      cursor: 'pointer',
                      background: selectedMembership?.id === m.id ? 'rgba(242,101,34,0.08)' : undefined,
                    }}
                    onClick={() => {
                      setSelectedMembership(m)
                      setCreditLimit(String(m.creditLimit))
                      setDiscount(String(m.discountPercent))
                    }}
                  >
                    <td>
                      {m.unit.unitCode} · {m.unit.name}
                    </td>
                    <td dir="ltr">
                      <code>{m.code}</code>
                    </td>
                    <td>{m.discountPercent}٪</td>
                    <td>{formatPrice(m.walletBalance)}</td>
                    <td>{formatPrice(m.creditAvailable)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card">
            {selectedMembership ? (
              <>
                <h3 style={{ marginTop: 0 }}>
                  {selectedMembership.unit.unitCode} · {selectedMembership.unit.name}
                </h3>
                <p className="page-sub" dir="ltr">
                  {selectedMembership.code}
                </p>
                <p>
                  لینک:{' '}
                  <a href={deepLink(selectedMembership.code)} target="_blank" rel="noreferrer" dir="ltr">
                    {deepLink(selectedMembership.code)}
                  </a>
                </p>
                <label className="field">
                  <span>تخفیف ٪</span>
                  <input value={discount} onChange={(e) => setDiscount(e.target.value)} dir="ltr" />
                </label>
                <label className="field">
                  <span>سقف اعتبار</span>
                  <input value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} dir="ltr" />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() =>
                      patchMembership.mutate({
                        discountPercent: Number(discount) || 0,
                        creditLimit: Number(creditLimit) || 0,
                      })
                    }
                  >
                    ذخیره
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() =>
                      openTicket({
                        unitCode: selectedMembership.unit.unitCode,
                        unitName: selectedMembership.unit.name,
                        floor: selectedMembership.unit.floor,
                        membershipCode: selectedMembership.code,
                        discountPercent: selectedMembership.discountPercent,
                        deepLink: deepLink(selectedMembership.code),
                        contactName: selectedMembership.contactName,
                        contactPhone: selectedMembership.unit.contactPhone,
                      })
                    }
                  >
                    <Ticket size={14} /> پاس واتساپ
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => regenCode.mutate()}>
                    <RefreshCw size={14} /> کد جدید
                  </button>
                </div>
                <label className="field">
                  <span>شارژ کیف‌پول (تومان)</span>
                  <input value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} dir="ltr" />
                </label>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => topupMutation.mutate()}
                  disabled={topupMutation.isPending}
                >
                  شارژ (+ هدیه پکیج ۱م)
                </button>
                <p className="page-sub" style={{ marginTop: 12 }}>
                  موجودی: {formatPrice(selectedMembership.walletBalance)} · استفاده‌شده اعتبار:{' '}
                  {formatPrice(selectedMembership.creditUsed)}
                </p>
              </>
            ) : (
              <p className="page-sub">یک عضویت را انتخاب کنید.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'deliveries' && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>کد سفارش</th>
                <th>مقصد</th>
                <th>وضعیت پیک</th>
                <th>مبلغ</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {(deliveries.data?.items ?? []).map((o) => (
                <tr key={o.id}>
                  <td dir="ltr">
                    <strong>{o.code}</strong>
                  </td>
                  <td>{o.deliveryLabel ?? o.unitCode}</td>
                  <td>{deliveryLabelFa(o.deliveryStatus)}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {o.deliveryStatus === 'QUEUED' && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => deliveryMutation.mutate({ id: o.id, deliveryStatus: 'OUT' })}
                      >
                        در مسیر
                      </button>
                    )}
                    {(o.deliveryStatus === 'QUEUED' || o.deliveryStatus === 'OUT') && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => deliveryMutation.mutate({ id: o.id, deliveryStatus: 'HANDED' })}
                      >
                        تحویل شد
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!deliveries.data?.items.length && <p className="page-sub">پیک بازی در صف نیست.</p>}
        </div>
      )}

      {tab === 'invoices' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>فاکتور ماهانه اعتبار</h3>
            <button type="button" className="btn-primary" onClick={() => genInvoices.mutate()}>
              تولید فاکتور ماه جاری
            </button>
          </div>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>دوره</th>
                <th>واحد</th>
                <th>مبلغ</th>
                <th>وضعیت</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(invoices.data?.items ?? []).map((inv) => (
                <tr key={inv.id}>
                  <td dir="ltr">{inv.periodKey}</td>
                  <td>
                    {inv.unitCode} · {inv.unitName}
                  </td>
                  <td>{formatPrice(inv.totalAmount)}</td>
                  <td>{inv.status === 'PAID' ? 'پرداخت‌شده' : 'باز'}</td>
                  <td>
                    {inv.status !== 'PAID' && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => payInvoice.mutate(inv.id)}
                      >
                        تسویه
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'report' && report.data && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>۷ روز اخیر</h3>
          <p>
            سفارش: {formatNumber(report.data.orderCount)} · فروش:{' '}
            {formatPrice(report.data.revenue)} · پیک: {formatNumber(report.data.deliveryCount)}
          </p>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>واحد</th>
                <th>سفارش</th>
                <th>فروش</th>
                <th>پیک</th>
              </tr>
            </thead>
            <tbody>
              {report.data.ranking.map((r) => (
                <tr key={r.unitCode + r.name}>
                  <td>
                    {r.unitCode} · {r.name}
                  </td>
                  <td>{formatNumber(r.orders)}</td>
                  <td>{formatPrice(r.total)}</td>
                  <td>{formatNumber(r.deliveries)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="page-sub">{label}</div>
      <strong style={{ fontSize: '1.1rem' }}>{value}</strong>
    </div>
  )
}

function deliveryLabelFa(s: string) {
  if (s === 'QUEUED') return 'صف پیک'
  if (s === 'OUT') return 'در مسیر'
  if (s === 'HANDED') return 'تحویل‌شده'
  return s
}
