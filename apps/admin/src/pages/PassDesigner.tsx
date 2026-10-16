/**
 * Visual unit-pass designer powered by Fabric.js
 * https://github.com/fabricjs/fabric.js
 * (same canvas engine used by card studios like tildemark/ccard-studio)
 */
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Canvas, FabricText, Rect, FabricImage } from 'fabric'
import {
  ArrowLeft,
  Download,
  ImagePlus,
  QrCode,
  Save,
  Square,
  Type,
  Trash2,
  Undo2,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import {
  PASS_H,
  PASS_VARIABLES,
  PASS_W,
  applyDefaultPassLayout,
  renderPassFromTemplate,
  sampleTicket,
  type MallPassTemplatePayload,
} from '../lib/passTemplate'

const SCALE = 0.42
const CUSTOM_PROPS = ['passField', 'name'] as const

export function PassDesigner() {
  const hostRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<Canvas | null>(null)
  const qc = useQueryClient()
  const [ready, setReady] = useState(false)
  const [msg, setMsg] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const templateQuery = useQuery({
    queryKey: ['mall-pass-template'],
    queryFn: () => api<{ template: MallPassTemplatePayload | null }>('/api/admin/mall/pass-template'),
  })

  useEffect(() => {
    if (!hostRef.current || !templateQuery.isSuccess) return

    const canvas = new Canvas(hostRef.current, {
      width: PASS_W,
      height: PASS_H,
      backgroundColor: '#2C2420',
      preserveObjectStacking: true,
      selection: true,
    })
    canvasRef.current = canvas

    let cancelled = false
    ;(async () => {
      const tpl = templateQuery.data?.template
      if (tpl?.fabricJson && Array.isArray((tpl.fabricJson as { objects?: unknown[] }).objects) && (tpl.fabricJson as { objects: unknown[] }).objects.length) {
        await canvas.loadFromJSON(tpl.fabricJson)
      } else {
        await applyDefaultPassLayout(canvas)
      }
      if (cancelled) return
      canvas.requestRenderAll()
      setReady(true)
    })()

    return () => {
      cancelled = true
      canvas.dispose()
      canvasRef.current = null
      setReady(false)
    }
  }, [templateQuery.isSuccess, templateQuery.dataUpdatedAt])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const canvas = canvasRef.current
      if (!canvas) throw new Error('بوم آماده نیست')
      const fabricJson = canvas.toObject([...CUSTOM_PROPS]) as Record<string, unknown>
      return api<{ ok: boolean; template: MallPassTemplatePayload }>('/api/admin/mall/pass-template', {
        method: 'PUT',
        body: JSON.stringify({ width: PASS_W, height: PASS_H, fabricJson }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mall-pass-template'] })
      setMsg('قالب پاس ذخیره شد — تیکت واحدها از این طرح ساخته می‌شوند')
    },
    onError: (e: Error) => setMsg(e.message),
  })

  const resetMutation = useMutation({
    mutationFn: () => api('/api/admin/mall/pass-template', { method: 'DELETE' }),
    onSuccess: async () => {
      const canvas = canvasRef.current
      if (!canvas) return
      await applyDefaultPassLayout(canvas)
      qc.invalidateQueries({ queryKey: ['mall-pass-template'] })
      setMsg('به طرح پیش‌فرض برگشت')
    },
  })

  const addText = (text = 'متن جدید') => {
    const canvas = canvasRef.current
    if (!canvas) return
    const t = new FabricText(text, {
      left: PASS_W / 2,
      top: PASS_H / 2,
      fontSize: 40,
      fill: '#FFFCF9',
      fontFamily: 'Vazirmatn, Tahoma, sans-serif',
      originX: 'center',
      textAlign: 'center',
    })
    canvas.add(t)
    canvas.setActiveObject(t)
    canvas.requestRenderAll()
  }

  const addRect = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const r = new Rect({
      left: 120,
      top: 200,
      width: 400,
      height: 120,
      fill: '#F26522',
      rx: 16,
      ry: 16,
    })
    canvas.add(r)
    canvas.setActiveObject(r)
    canvas.requestRenderAll()
  }

  const addQrPlaceholder = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const box = new Rect({
      left: (PASS_W - 320) / 2,
      top: 700,
      width: 320,
      height: 320,
      fill: '#E6E0DA',
      rx: 20,
      ry: 20,
      name: 'qr',
    })
    ;(box as unknown as { passField: string }).passField = 'qr'
    canvas.add(box)
    canvas.add(
      new FabricText('جای QR', {
        left: PASS_W / 2,
        top: 840,
        fontSize: 32,
        fill: '#2C2420',
        fontFamily: 'Vazirmatn, Tahoma, sans-serif',
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        name: 'qr-label',
      }),
    )
    canvas.setActiveObject(box)
    canvas.requestRenderAll()
  }

  const addImage = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file || !canvasRef.current) return
      const url = URL.createObjectURL(file)
      const img = await FabricImage.fromURL(url)
      img.scaleToWidth(360)
      img.set({ left: 200, top: 200 })
      canvasRef.current.add(img)
      canvasRef.current.setActiveObject(img)
      canvasRef.current.requestRenderAll()
    }
    input.click()
  }

  const insertVariable = (key: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (active instanceof FabricText) {
      active.set('text', `${active.text || ''}{{${key}}}`)
      canvas.requestRenderAll()
      return
    }
    addText(`{{${key}}}`)
  }

  const removeSelected = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getActiveObjects().forEach((o) => canvas.remove(o))
    canvas.discardActiveObject()
    canvas.requestRenderAll()
  }

  const preview = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setMsg('')
    try {
      const fabricJson = canvas.toObject([...CUSTOM_PROPS]) as Record<string, unknown>
      const blob = await renderPassFromTemplate(
        { version: 1, width: PASS_W, height: PASS_H, fabricJson },
        sampleTicket(),
      )
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'پیش‌نمایش ناموفق')
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <Link to="/mall-club" className="page-sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={14} /> بازگشت به سیتی‌سنتر
          </Link>
          <h1 style={{ marginTop: 8 }}>طراحی پاس واحد</h1>
          <p className="page-sub">
            ادیتور بصری با{' '}
            <a href="https://github.com/fabricjs/fabric.js" target="_blank" rel="noreferrer">
              Fabric.js <ExternalLink size={12} style={{ display: 'inline' }} />
            </a>{' '}
            — موتور پروژه‌هایی مثل{' '}
            <a href="https://github.com/tildemark/ccard-studio" target="_blank" rel="noreferrer">
              ccard-studio
            </a>
            . طرح را بچین، متغیر بگذار، ذخیره کن؛ بعد از لیست واحدها PNG بگیر.
          </p>
        </div>
        <div className="page-actions" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" onClick={() => void preview()}>
            <Download size={16} /> پیش‌نمایش
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            <Undo2 size={16} /> طرح پیش‌فرض
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !ready}
          >
            <Save size={16} /> {saveMutation.isPending ? '…' : 'ذخیره قالب'}
          </button>
        </div>
      </header>

      {msg && (
        <p className="field-hint" style={{ color: 'var(--success)', marginBottom: 12 }}>
          {msg}
        </p>
      )}

      <div
        className="pass-designer-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 220px) 1fr minmax(180px, 240px)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <aside className="card" style={{ display: 'grid', gap: 8 }}>
          <h3 style={{ margin: 0 }}>ابزارها</h3>
          <button type="button" className="btn-secondary" onClick={() => addText()}>
            <Type size={16} /> متن
          </button>
          <button type="button" className="btn-secondary" onClick={addRect}>
            <Square size={16} /> شکل
          </button>
          <button type="button" className="btn-secondary" onClick={addQrPlaceholder}>
            <QrCode size={16} /> جای QR
          </button>
          <button type="button" className="btn-secondary" onClick={addImage}>
            <ImagePlus size={16} /> تصویر
          </button>
          <button type="button" className="btn-secondary" onClick={removeSelected}>
            <Trash2 size={16} /> حذف انتخاب
          </button>
          <p className="field-hint" style={{ marginTop: 8 }}>
            دوبار کلیک روی متن برای ویرایش. بکش برای جابه‌جایی و تغییر اندازه.
          </p>
        </aside>

        <div
          className="card"
          style={{
            overflow: 'auto',
            display: 'grid',
            placeItems: 'center',
            background: '#111',
            minHeight: 520,
          }}
        >
          <div
            style={{
              width: PASS_W * SCALE,
              height: PASS_H * SCALE,
              overflow: 'hidden',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,.45)',
            }}
          >
            <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
              <canvas ref={hostRef} />
            </div>
          </div>
          {!ready && <p className="field-hint">در حال آماده‌سازی بوم…</p>}
        </div>

        <aside className="card" style={{ display: 'grid', gap: 10 }}>
          <h3 style={{ margin: 0 }}>متغیرهای واحد</h3>
          <p className="field-hint">روی دکمه بزن تا داخل متن فعال یا به‌صورت فیلد جدید برود.</p>
          {PASS_VARIABLES.map((v) => (
            <button
              key={v.key}
              type="button"
              className="btn-secondary"
              style={{ justifyContent: 'space-between' }}
              onClick={() => insertVariable(v.key)}
            >
              <span>{v.label}</span>
              <code dir="ltr" style={{ fontSize: 11 }}>{`{{${v.key}}}`}</code>
            </button>
          ))}
          {previewUrl && (
            <div style={{ marginTop: 8 }}>
              <h3>پیش‌نمایش خروجی</h3>
              <img
                src={previewUrl}
                alt="preview"
                style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }}
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
