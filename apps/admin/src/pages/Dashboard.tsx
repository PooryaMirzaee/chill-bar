import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { Link } from 'react-router-dom'
import { ShoppingBag, Wallet, TrendingUp, Clock, Calculator, CreditCard } from 'lucide-react'
import type { DashboardStats } from '@chill-bar/shared'
import { api } from '../lib/api'
import { formatNumber, formatPrice } from '../lib/format'

const WEEKDAY = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardStats>('/api/admin/dashboard'),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return <PageSkeleton />
  }

  const peakChart = data.hourlyOrders.filter((h) => h.hour >= 8 && h.hour <= 23)
  const revenueChart = data.revenueLast7Days.map((d) => ({
    ...d,
    label: WEEKDAY[new Date(d.date).getDay()],
  }))

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>داشبورد</h1>
          <p className="page-sub">نمای کلی عملکرد امروز</p>
        </div>
        <div className="page-actions">
          <Link to="/pos" className="btn-primary">
            <Calculator size={16} /> صندوق فروش
          </Link>
        </div>
      </header>

      <div className="stat-grid">
        <StatCard
          icon={<ShoppingBag />}
          label="سفارش‌های امروز"
          value={formatNumber(data.ordersToday)}
          tone="orange"
        />
        <StatCard
          icon={<Wallet />}
          label="درآمد امروز"
          value={formatPrice(data.revenueToday)}
          tone="green"
        />
        <StatCard
          icon={<Calculator />}
          label="فروش صندوق"
          value={formatPrice(data.posRevenueToday ?? 0)}
          tone="blue"
        />
        <StatCard
          icon={<CreditCard />}
          label="سفارش آنلاین"
          value={formatPrice(data.onlineRevenueToday ?? 0)}
          tone="blue"
        />
        <StatCard
          icon={<TrendingUp />}
          label="میانگین هر سفارش"
          value={formatPrice(data.avgOrderValue)}
          tone="blue"
        />
        <StatCard
          icon={<Clock />}
          label="در انتظار تایید"
          value={formatNumber(data.pendingCount)}
          tone="red"
        />
        {(data.unpaidOrdersCount ?? 0) > 0 && (
          <StatCard
            icon={<Wallet />}
            label="پرداخت نشده"
            value={formatNumber(data.unpaidOrdersCount ?? 0)}
            tone="red"
          />
        )}
      </div>

      {data.openShift && (
        <section className="card dash-shift-banner">
          <strong>شیفت باز</strong>
          <span>
            {data.openShift.openedByName ?? '—'} ·{' '}
            {new Date(data.openShift.openedAt).toLocaleTimeString('fa-IR')}
          </span>
          <Link to="/pos/shifts">گزارش شیفت‌ها</Link>
          <Link to="/reports">گزارش مالی</Link>
        </section>
      )}

      <div className="dash-grid">
        <section className="card">
          <h3>درآمد ۷ روز اخیر</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueChart} margin={{ left: 0, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F26522" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#F26522" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="label" tick={{ fill: '#9aa0ab', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9aa0ab', fontSize: 12 }} width={48} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [formatPrice(v), 'درآمد']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F26522"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <h3>ساعات پرتراکنش امروز</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peakChart} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="hour" tick={{ fill: '#9aa0ab', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#9aa0ab', fontSize: 12 }} width={32} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number) => [formatNumber(v), 'سفارش']}
                labelFormatter={(h) => `ساعت ${h}`}
              />
              <Bar dataKey="count" fill="#F26522" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card">
          <h3>پرفروش‌ترین آیتم‌های امروز</h3>
          {data.popularItems.length === 0 ? (
            <p className="empty-hint">هنوز سفارشی ثبت نشده</p>
          ) : (
            <ul className="popular-list">
              {data.popularItems.map((item, i) => (
                <li key={item.name}>
                  <span className="popular-rank">{i + 1}</span>
                  <span className="popular-emoji">{item.emoji}</span>
                  <span className="popular-name">{item.name}</span>
                  <span className="popular-count">{formatNumber(item.count)} عدد</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

const tooltipStyle = {
  background: '#15151d',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  color: '#fff',
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: string
}) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="page">
      <div className="stat-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card skeleton" style={{ height: 92 }} />
        ))}
      </div>
      <div className="dash-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card skeleton" style={{ height: 300 }} />
        ))}
      </div>
    </div>
  )
}
