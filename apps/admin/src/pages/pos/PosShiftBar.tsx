import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PosShift, PosShiftReport } from '@chill-bar/shared'
import { api } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { PosNumpad } from './PosNumpad'

interface PosShiftBarProps {
  onShiftChange?: () => void
}

export function PosShiftBar({ onShiftChange }: PosShiftBarProps) {
  const queryClient = useQueryClient()
  const [showOpen, setShowOpen] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [openingCash, setOpeningCash] = useState(0)
  const [closingCash, setClosingCash] = useState(0)
  const [closeReport, setCloseReport] = useState<PosShiftReport | null>(null)
  const [closedShift, setClosedShift] = useState<PosShift | null>(null)

  const { data: shift } = useQuery({
    queryKey: ['pos-shift'],
    queryFn: () => api<PosShift | null>('/api/admin/shifts/current'),
    refetchInterval: 30_000,
  })

  const openMutation = useMutation({
    mutationFn: (cash: number) =>
      api<PosShift>('/api/admin/shifts/open', {
        method: 'POST',
        body: JSON.stringify({ openingCash: cash }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-shift'] })
      setShowOpen(false)
      setOpeningCash(0)
      onShiftChange?.()
    },
  })

  const closeMutation = useMutation({
    mutationFn: (cash: number) =>
      api<{ shift: PosShift; report: PosShiftReport }>(`/api/admin/shifts/${shift!.id}/close`, {
        method: 'POST',
        body: JSON.stringify({ closingCash: cash }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pos-shift'] })
      queryClient.invalidateQueries({ queryKey: ['pos-shifts'] })
      setCloseReport(data.report)
      setClosedShift(data.shift)
      onShiftChange?.()
    },
  })

  return (
    <div className="pos-shift-bar">
      {shift ? (
        <>
          <span className="pos-shift-status open">شیفت باز</span>
          <span className="pos-shift-meta">
            {shift.openedByName} · {new Date(shift.openedAt).toLocaleTimeString('fa-IR')}
          </span>
          <span className="pos-shift-cash">صندوق اولیه: {formatPrice(shift.openingCash)}</span>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setShowClose(true)}>
            بستن شیفت
          </button>
        </>
      ) : (
        <>
          <span className="pos-shift-status closed">شیفت بسته</span>
          <button type="button" className="btn-primary btn-sm" onClick={() => setShowOpen(true)}>
            باز کردن شیفت
          </button>
        </>
      )}

      {showOpen && (
        <div className="pos-modal-overlay" onClick={() => setShowOpen(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <h3>باز کردن شیفت</h3>
            <PosNumpad
              label="مبلغ اولیه صندوق (تومان)"
              value={openingCash}
              onChange={setOpeningCash}
              onConfirm={() => openMutation.mutate(openingCash)}
            />
            <button
              type="button"
              className="btn-primary"
              disabled={openMutation.isPending}
              onClick={() => openMutation.mutate(openingCash)}
            >
              باز کردن شیفت
            </button>
          </div>
        </div>
      )}

      {showClose && shift && (
        <div className="pos-modal-overlay" onClick={() => !closeReport && setShowClose(false)}>
          <div className="pos-modal pos-modal-wide" onClick={(e) => e.stopPropagation()}>
            {closeReport ? (
              <>
                <h3>گزارش شیفت</h3>
                <div className="pos-shift-report">
                  <div className="pos-report-row">
                    <span>تعداد فیش</span>
                    <strong>{closeReport.orderCount.toLocaleString('fa-IR')}</strong>
                  </div>
                  <div className="pos-report-row">
                    <span>فروش خالص</span>
                    <strong>{formatPrice(closeReport.netSales)}</strong>
                  </div>
                  <div className="pos-report-row">
                    <span>نقد</span>
                    <span>{formatPrice(closeReport.cashTotal)}</span>
                  </div>
                  <div className="pos-report-row">
                    <span>کارت</span>
                    <span>{formatPrice(closeReport.cardTotal)}</span>
                  </div>
                  <div className="pos-report-row">
                    <span>تخفیف</span>
                    <span>{formatPrice(closeReport.totalDiscount)}</span>
                  </div>
                  <div className="pos-report-row">
                    <span>برگشت</span>
                    <span>{formatPrice(closeReport.totalRefunds)}</span>
                  </div>
                  <div className="pos-report-row highlight">
                    <span>نقد مورد انتظار</span>
                    <strong>{formatPrice(closeReport.expectedCashInDrawer)}</strong>
                  </div>
                  <div className="pos-report-row highlight">
                    <span>اختلاف</span>
                    <strong>{formatPrice(closedShift?.difference ?? 0)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setShowClose(false)
                    setCloseReport(null)
                    setClosedShift(null)
                    setClosingCash(0)
                  }}
                >
                  بستن
                </button>
              </>
            ) : (
              <>
                <h3>بستن شیفت</h3>
                <PosNumpad
                  label="مبلغ نقد در کشو (تومان)"
                  value={closingCash}
                  onChange={setClosingCash}
                  onConfirm={() => closeMutation.mutate(closingCash)}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={closeMutation.isPending}
                  onClick={() => closeMutation.mutate(closingCash)}
                >
                  تأیید و بستن شیفت
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
