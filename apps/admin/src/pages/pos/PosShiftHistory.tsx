import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { PosShift, PosShiftReport } from '@chill-bar/shared'
import { api } from '../../lib/api'
import { formatPrice, formatDateTime } from '../../lib/format'
import './pos.css'

function ShiftReportCard({ shift }: { shift: PosShift }) {
  const { data: report } = useQuery({
    queryKey: ['shift-report', shift.id],
    queryFn: () => api<PosShiftReport>(`/api/admin/shifts/${shift.id}/report`),
  })

  return (
    <article className="pos-shift-card">
      <header>
        <div>
          <strong>
            {shift.status === 'OPEN' ? 'شیفت باز' : 'شیفت بسته'} — {shift.openedByName}
          </strong>
          <span>{formatDateTime(shift.openedAt)}</span>
          {shift.closedAt && <span>تا {formatDateTime(shift.closedAt)}</span>}
        </div>
        {shift.difference != null && (
          <span className={shift.difference === 0 ? 'ok' : 'warn'}>
            اختلاف: {formatPrice(shift.difference)}
          </span>
        )}
      </header>
      {report && (
        <div className="pos-shift-report compact">
          <div className="pos-report-row">
            <span>فیش</span>
            <span>{report.orderCount.toLocaleString('fa-IR')}</span>
          </div>
          <div className="pos-report-row">
            <span>فروش خالص</span>
            <strong>{formatPrice(report.netSales)}</strong>
          </div>
          <div className="pos-report-row">
            <span>نقد / کارت</span>
            <span>
              {formatPrice(report.cashTotal)} / {formatPrice(report.cardTotal)}
            </span>
          </div>
        </div>
      )}
    </article>
  )
}

export function PosShiftHistory() {
  const { data: shifts = [] } = useQuery({
    queryKey: ['pos-shifts'],
    queryFn: () => api<PosShift[]>('/api/admin/shifts?limit=30'),
  })

  return (
    <div className="pos-shell pos-history-page">
      <header className="pos-topbar">
        <div className="pos-topbar-start">
          <Link to="/pos" className="pos-back">
            <ArrowRight size={18} /> صندوق
          </Link>
          <h1>تاریخچه شیفت‌ها</h1>
        </div>
      </header>
      <div className="pos-shift-list">
        {shifts.map((shift) => (
          <ShiftReportCard key={shift.id} shift={shift} />
        ))}
      </div>
    </div>
  )
}
