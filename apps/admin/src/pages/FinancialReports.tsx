import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ArrowDown, ArrowUp, ArrowUpDown, Calendar, Trash2, TrendingUp, Wallet } from 'lucide-react'
import type {
  FinancialDailyReport,
  FinancialOrderRow,
  FinancialOrderSortField,
  FinancialSortDirection,
  FinancialSummaryReport,
} from '@chill-bar/shared'
import { ORDER_CHANNEL_LABEL, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from '@chill-bar/shared'
import { api } from '../lib/api'
import { formatDateTime, formatNumber, formatPrice } from '../lib/format'

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

function monthAgoInputValue(): string {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

const tooltipStyle = {
  background: '#15151d',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
}

const SORT_LABELS: Record<FinancialOrderSortField, string> = {
  createdAt: 'زمان',
  code: 'کد',
  total: 'مبلغ',
  receiptNumber: 'شماره فیش',
  channel: 'کانال',
}

export function FinancialReports() {
  const queryClient = useQueryClient()
  const [dailyDate, setDailyDate] = useState(todayInputValue)
  const [summaryFrom, setSummaryFrom] = useState(monthAgoInputValue)
  const [summaryTo, setSummaryTo] = useState(todayInputValue)
  const [dailySort, setDailySort] = useState<{
    sortBy: FinancialOrderSortField
    sortDir: FinancialSortDirection
  }>({ sortBy: 'createdAt', sortDir: 'desc' })
  const [summarySort, setSummarySort] = useState<{
    sortBy: FinancialOrderSortField
    sortDir: FinancialSortDirection
  }>({ sortBy: 'createdAt', sortDir: 'desc' })

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ['financial-daily', dailyDate, dailySort.sortBy, dailySort.sortDir],
    queryFn: () =>
      api<FinancialDailyReport>(
        `/api/admin/reports/financial/daily?date=${dailyDate}&sortBy=${dailySort.sortBy}&sortDir=${dailySort.sortDir}`,
      ),
  })

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['financial-summary', summaryFrom, summaryTo, summarySort.sortBy, summarySort.sortDir],
    queryFn: () =>
      api<FinancialSummaryReport>(
        `/api/admin/reports/financial/summary?from=${summaryFrom}&to=${summaryTo}&sortBy=${summarySort.sortBy}&sortDir=${summarySort.sortDir}`,
      ),
  })

  const chartData = useMemo(
    () =>
      (summary?.dailyBreakdown ?? []).map((row) => ({
        ...row,
        label: new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(
          new Date(row.date),
        ),
      })),
    [summary],
  )

  const toggleDailySort = (sortBy: FinancialOrderSortField) => {
    setDailySort((current) => ({
      sortBy,
      sortDir: current.sortBy === sortBy && current.sortDir === 'desc' ? 'asc' : 'desc',
    }))
  }

  const toggleSummarySort = (sortBy: FinancialOrderSortField) => {
    setSummarySort((current) => ({
      sortBy,
      sortDir: current.sortBy === sortBy && current.sortDir === 'desc' ? 'asc' : 'desc',
    }))
  }

  const [voidTarget, setVoidTarget] = useState<FinancialOrderRow | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api(`/api/admin/orders/${id}/void`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || null }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-daily'] })
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['recent-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setVoidTarget(null)
      setVoidReason('')
    },
  })

  const handleVoid = () => {
    if (!voidTarget) return
    voidMutation.mutate({ id: voidTarget.id, reason: voidReason.trim() || undefined })
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>گزارش‌های مالی</h1>
          <p className="page-sub">مدیریت فیش‌های روزانه و گزارش کامل با امکان مرتب‌سازی</p>
        </div>
      </header>

      <section className="card" style={{ marginBottom: 16 }}>
        <header className="fin-section-head">
          <div>
            <h3>
              <Calendar size={18} /> گزارش روزانه
            </h3>
            <p className="page-sub">فروش، تخفیف و لیست فیش‌های همان روز</p>
          </div>
          <label className="field fin-date-field">
            <span>تاریخ</span>
            <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
          </label>
        </header>

        {dailyLoading || !daily ? (
          <div className="stat-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card skeleton" style={{ height: 92 }} />
            ))}
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <ReportStat label="تعداد فیش" value={formatNumber(daily.orderCount)} tone="orange" />
              <ReportStat label="فروش خالص" value={formatPrice(daily.netRevenue)} tone="green" />
              <ReportStat label="تخفیف" value={formatPrice(daily.totalDiscount)} tone="blue" />
              <ReportStat
                label="میانگین سفارش"
                value={formatPrice(daily.avgOrderValue)}
                tone="blue"
              />
            </div>
            <div className="fin-detail-grid">
              <ReportRow label="فروش ناخالص" value={formatPrice(daily.grossRevenue)} />
              <ReportRow label="صندوق" value={`${formatNumber(daily.posOrders)} · ${formatPrice(daily.posRevenue)}`} />
              <ReportRow
                label="آنلاین / کیوسک"
                value={`${formatNumber(daily.onlineOrders)} · ${formatPrice(daily.onlineRevenue)}`}
              />
              <ReportRow
                label="نقد / کارت / ترکیبی"
                value={`${formatPrice(daily.cashTotal)} / ${formatPrice(daily.cardTotal)} / ${formatPrice(daily.mixedTotal)}`}
              />
              <ReportRow label="لغو شده" value={formatNumber(daily.cancelledCount)} />
              <ReportRow label="استرداد" value={formatPrice(daily.refundedTotal)} />
            </div>

            <OrdersTable
              title={`فیش‌های ${dailyDate}`}
              orders={daily.orders ?? []}
              sortBy={dailySort.sortBy}
              sortDir={dailySort.sortDir}
              onSort={toggleDailySort}
              onVoid={setVoidTarget}
            />
          </>
        )}
      </section>

      <section className="card">
        <header className="fin-section-head">
          <div>
            <h3>
              <TrendingUp size={18} /> گزارش کلی
            </h3>
            <p className="page-sub">جمع فروش در بازه زمانی انتخابی</p>
          </div>
          <div className="fin-date-range">
            <label className="field fin-date-field">
              <span>از</span>
              <input type="date" value={summaryFrom} onChange={(e) => setSummaryFrom(e.target.value)} />
            </label>
            <label className="field fin-date-field">
              <span>تا</span>
              <input type="date" value={summaryTo} onChange={(e) => setSummaryTo(e.target.value)} />
            </label>
          </div>
        </header>

        {summaryLoading || !summary ? (
          <div className="card skeleton" style={{ height: 320 }} />
        ) : (
          <>
            <div className="stat-grid">
              <ReportStat label="کل فیش‌ها" value={formatNumber(summary.orderCount)} tone="orange" />
              <ReportStat label="فروش خالص" value={formatPrice(summary.netRevenue)} tone="green" />
              <ReportStat
                label="فروش صندوق"
                value={formatPrice(summary.posRevenue)}
                tone="blue"
              />
              <ReportStat
                label="فروش آنلاین"
                value={formatPrice(summary.onlineRevenue)}
                tone="blue"
              />
            </div>

            <div className="fin-detail-grid" style={{ marginBottom: 16 }}>
              <ReportRow label="فروش ناخالص" value={formatPrice(summary.grossRevenue)} />
              <ReportRow label="تخفیف کل" value={formatPrice(summary.totalDiscount)} />
              <ReportRow
                label="نقد / کارت / ترکیبی"
                value={`${formatPrice(summary.cashTotal)} / ${formatPrice(summary.cardTotal)} / ${formatPrice(summary.mixedTotal)}`}
              />
              <ReportRow label="استرداد کل" value={formatPrice(summary.refundedTotal)} />
            </div>

            <h4 style={{ marginBottom: 8 }}>روند روزانه فروش خالص</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#9aa0ab', fontSize: 11 }} />
                <YAxis tick={{ fill: '#9aa0ab', fontSize: 12 }} width={56} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number) => [formatPrice(v), 'فروش خالص']}
                />
                <Bar dataKey="netRevenue" fill="#F26522" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <OrdersTable
              title="همه فیش‌های بازه"
              orders={summary.orders}
              sortBy={summarySort.sortBy}
              sortDir={summarySort.sortDir}
              onSort={toggleSummarySort}
              onVoid={setVoidTarget}
            />
          </>
        )}
      </section>

      {voidTarget && (
        <div className="modal-overlay" onClick={() => !voidMutation.isPending && setVoidTarget(null)}>
          <div className="modal fin-void-modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>حذف فاکتور</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setVoidTarget(null)}
                disabled={voidMutation.isPending}
              >
                ✕
              </button>
            </header>
            <div className="modal-body">
              <p>
                فاکتور <strong>{voidTarget.code}</strong>
                {voidTarget.receiptNumber != null && (
                  <> (فیش #{voidTarget.receiptNumber.toLocaleString('fa-IR')})</>
                )}{' '}
                ابطال می‌شود و از گزارش مالی حذف خواهد شد.
              </p>
              {voidTarget.paymentStatus === 'PAID' && (
                <p className="fin-void-warn">این فاکتور پرداخت‌شده است — مبلغ به‌عنوان استرداد ثبت می‌شود.</p>
              )}
              <label className="field">
                <span>دلیل (اختیاری)</span>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="مثلاً ثبت اشتباه"
                  maxLength={300}
                />
              </label>
              {voidMutation.isError && (
                <p className="error-text">
                  {voidMutation.error instanceof Error ? voidMutation.error.message : 'خطا در حذف فاکتور'}
                </p>
              )}
            </div>
            <footer className="modal-foot">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setVoidTarget(null)}
                disabled={voidMutation.isPending}
              >
                انصراف
              </button>
              <button
                type="button"
                className="btn-primary danger"
                onClick={handleVoid}
                disabled={voidMutation.isPending}
              >
                {voidMutation.isPending ? 'در حال حذف…' : 'حذف فاکتور'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

function OrdersTable({
  title,
  orders,
  sortBy,
  sortDir,
  onSort,
  onVoid,
}: {
  title: string
  orders: FinancialOrderRow[]
  sortBy: FinancialOrderSortField
  sortDir: FinancialSortDirection
  onSort: (field: FinancialOrderSortField) => void
  onVoid: (order: FinancialOrderRow) => void
}) {
  return (
    <div className="fin-orders-section">
      <div className="fin-orders-head">
        <h4>{title}</h4>
        <span>{orders.length.toLocaleString('fa-IR')} فیش</span>
      </div>
      {orders.length === 0 ? (
        <p className="empty-hint">فیشی برای نمایش نیست</p>
      ) : (
        <div className="fin-orders-table-wrap">
          <table className="fin-orders-table">
            <thead>
              <tr>
                {(['createdAt', 'code', 'receiptNumber', 'channel', 'total'] as const).map((field) => (
                  <th key={field}>
                    <button type="button" className="fin-sort-btn" onClick={() => onSort(field)}>
                      {SORT_LABELS[field]}
                      <SortIcon active={sortBy === field} dir={sortDir} />
                    </button>
                  </th>
                ))}
                <th>وضعیت</th>
                <th>پرداخت</th>
                <th>مشتری</th>
                <th>اقلام</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>
                    <strong>{order.code}</strong>
                  </td>
                  <td>{order.receiptNumber?.toLocaleString('fa-IR') ?? '—'}</td>
                  <td>{ORDER_CHANNEL_LABEL[order.channel]}</td>
                  <td>
                    <strong>{formatPrice(order.total)}</strong>
                    {order.discountAmount > 0 && (
                      <small className="fin-discount"> −{formatPrice(order.discountAmount)}</small>
                    )}
                  </td>
                  <td>{ORDER_STATUS_LABEL[order.status]}</td>
                  <td>
                    {order.paymentMethod
                      ? PAYMENT_METHOD_LABEL[order.paymentMethod]
                      : '—'}
                  </td>
                  <td>{order.customerName ?? '—'}</td>
                  <td>{order.itemCount.toLocaleString('fa-IR')}</td>
                  <td>
                    {order.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        className="btn-ghost-sm danger fin-void-btn"
                        title="حذف فاکتور"
                        onClick={() => onVoid(order)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: FinancialSortDirection }) {
  if (!active) return <ArrowUpDown size={14} />
  return dir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
}

function ReportStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-icon">
        <Wallet size={18} />
      </div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
      </div>
    </div>
  )
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="fin-report-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
