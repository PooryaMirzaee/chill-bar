import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, Palette, Store, Bot, MessageSquare, Type, Smile, Volume2, LayoutGrid, Home, Sparkles, Calculator, Coffee } from 'lucide-react'
import type { StoreSettings, AiSettings, SmsSettings, AdminAlertSettings, PosSettings } from '@chill-bar/shared'
import { DEFAULT_AI_SETTINGS, DEFAULT_SMS_SETTINGS, DEFAULT_ADMIN_ALERT_SETTINGS, DEFAULT_POS_SETTINGS } from '@chill-bar/shared'
import { api } from '../lib/api'
import { AppearanceSettings } from '../components/AppearanceSettings'
import { AiSettingsPanel } from '../components/AiSettingsPanel'
import { SmsSettingsPanel } from '../components/SmsSettingsPanel'
import { CopySettingsPanel } from '../components/CopySettingsPanel'
import { MoodsSettingsPanel } from '../components/MoodsSettingsPanel'
import { ScratchRewardSettingsPanel } from '../components/ScratchRewardSettingsPanel'
import { AlertSettingsPanel } from '../components/AlertSettingsPanel'
import { HomeAppearancePanel } from '../components/HomeAppearancePanel'
import { MenuAppearancePanel } from '../components/MenuAppearancePanel'
import { WaitLoungeSettingsPanel } from '../components/WaitLoungeSettingsPanel'
import { ComboRecommendationSettingsPanel } from '../components/ComboRecommendationSettingsPanel'
import { CoffeeFortuneSettingsPanel } from '../components/CoffeeFortuneSettingsPanel'
import { PosSettingsPanel } from '../components/PosSettingsPanel'

const FEATURE_LABELS: Record<string, string> = {
  spinWheel: 'گردونه شانس',
  aiWaiter: 'گارسون هوشمند',
  scratchSurprise: 'کارت اسکرچ',
  swipeDeck: 'کشف با سوایپ',
  waitLounge: 'سالن انتظار (بازی زمان آماده‌سازی)',
  smartCombo: 'کمبو هوشمند',
  coffeeFortune: 'فال قهوه (سرگرمی روزانه)',
}

type Tab = 'store' | 'appearance' | 'home' | 'menu' | 'copy' | 'moods' | 'combo' | 'fortune' | 'features' | 'pos' | 'ai' | 'sms' | 'alerts'

export function Settings() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('store')
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<StoreSettings>('/api/settings'),
  })
  const { data: aiData } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => api<AiSettings>('/api/admin/ai'),
  })
  const { data: smsData } = useQuery({
    queryKey: ['sms-settings'],
    queryFn: () => api<SmsSettings>('/api/admin/sms'),
  })
  const { data: alertData } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: () => api<AdminAlertSettings>('/api/admin/alerts'),
  })
  const { data: posData } = useQuery({
    queryKey: ['pos-settings'],
    queryFn: () => api<PosSettings>('/api/admin/pos/settings'),
  })
  const [form, setForm] = useState<StoreSettings | null>(null)
  const [aiForm, setAiForm] = useState<AiSettings>(DEFAULT_AI_SETTINGS)
  const [smsForm, setSmsForm] = useState<SmsSettings>(DEFAULT_SMS_SETTINGS)
  const [alertForm, setAlertForm] = useState<AdminAlertSettings>(DEFAULT_ADMIN_ALERT_SETTINGS)
  const [posForm, setPosForm] = useState<PosSettings>(DEFAULT_POS_SETTINGS)
  const [saved, setSaved] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)
  const [smsSaved, setSmsSaved] = useState(false)
  const [alertSaved, setAlertSaved] = useState(false)
  const [posSaved, setPosSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  useEffect(() => {
    if (aiData) setAiForm(aiData)
  }, [aiData])

  useEffect(() => {
    if (smsData) setSmsForm(smsData)
  }, [smsData])

  useEffect(() => {
    if (alertData) setAlertForm(alertData)
  }, [alertData])

  useEffect(() => {
    if (posData) setPosForm(posData)
  }, [posData])

  const mutation = useMutation({
    mutationFn: (payload: StoreSettings) =>
      api('/api/admin/settings', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setSaved(true)
      setSaveError(null)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: (err: Error) => setSaveError(err.message),
  })

  const aiMutation = useMutation({
    mutationFn: (payload: AiSettings) =>
      api('/api/admin/ai', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] })
      setAiSaved(true)
      setSaveError(null)
      setTimeout(() => setAiSaved(false), 2000)
    },
    onError: (err: Error) => setSaveError(err.message),
  })

  const smsMutation = useMutation({
    mutationFn: (payload: SmsSettings) =>
      api('/api/admin/sms', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-settings'] })
      setSmsSaved(true)
      setSaveError(null)
      setTimeout(() => setSmsSaved(false), 2000)
    },
    onError: (err: Error) => setSaveError(err.message),
  })

  const alertMutation = useMutation({
    mutationFn: (payload: AdminAlertSettings) =>
      api('/api/admin/alerts', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-alerts'] })
      setAlertSaved(true)
      setSaveError(null)
      setTimeout(() => setAlertSaved(false), 2000)
    },
    onError: (err: Error) => setSaveError(err.message),
  })

  const posMutation = useMutation({
    mutationFn: (payload: PosSettings) =>
      api('/api/admin/pos/settings', { method: 'PUT', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos-settings'] })
      setPosSaved(true)
      setSaveError(null)
      setTimeout(() => setPosSaved(false), 2000)
    },
    onError: (err: Error) => setSaveError(err.message),
  })

  if (!form) {
    return (
      <div className="page">
        <div className="card skeleton" style={{ height: 320 }} />
      </div>
    )
  }

  const save = () => {
    setSaveError(null)
    if (tab === 'ai') aiMutation.mutate(aiForm)
    else if (tab === 'sms') smsMutation.mutate(smsForm)
    else if (tab === 'alerts') alertMutation.mutate(alertForm)
    else if (tab === 'pos') posMutation.mutate(posForm)
    else mutation.mutate(form)
  }

  const saving =
    tab === 'ai'
      ? aiMutation.isPending
      : tab === 'sms'
        ? smsMutation.isPending
        : tab === 'alerts'
          ? alertMutation.isPending
          : tab === 'pos'
            ? posMutation.isPending
            : mutation.isPending
  const savedLabel =
    tab === 'ai'
      ? aiSaved
      : tab === 'sms'
        ? smsSaved
        : tab === 'alerts'
          ? alertSaved
          : tab === 'pos'
            ? posSaved
            : saved

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>تنظیمات</h1>
          <p className="page-sub">فروشگاه، متن‌ها، مود، ظاهر، پیامک، AI و قابلیت‌ها</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={save} disabled={saving}>
            <Save size={18} /> {savedLabel ? 'ذخیره شد' : 'ذخیره'}
          </button>
        </div>
      </header>

      {saveError && (
        <div className="settings-save-error" role="alert">
          {saveError}
        </div>
      )}

      <div className="settings-tabs">
        <button type="button" className={tab === 'store' ? 'active' : ''} onClick={() => setTab('store')}>
          <Store size={16} /> فروشگاه
        </button>
        <button type="button" className={tab === 'appearance' ? 'active' : ''} onClick={() => setTab('appearance')}>
          <Palette size={16} /> ظاهر و لوگو
        </button>
        <button type="button" className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>
          <Home size={16} /> صفحه خانه
        </button>
        <button type="button" className={tab === 'menu' ? 'active' : ''} onClick={() => setTab('menu')}>
          <LayoutGrid size={16} /> ظاهر منو
        </button>
        <button type="button" className={tab === 'copy' ? 'active' : ''} onClick={() => setTab('copy')}>
          <Type size={16} /> متن‌های اپ
        </button>
        <button type="button" className={tab === 'moods' ? 'active' : ''} onClick={() => setTab('moods')}>
          <Smile size={16} /> مودها
        </button>
        <button type="button" className={tab === 'combo' ? 'active' : ''} onClick={() => setTab('combo')}>
          <Sparkles size={16} /> پیشنهاد ترکیب
        </button>
        <button type="button" className={tab === 'fortune' ? 'active' : ''} onClick={() => setTab('fortune')}>
          <Coffee size={16} /> فال قهوه
        </button>
        <button type="button" className={tab === 'pos' ? 'active' : ''} onClick={() => setTab('pos')}>
          <Calculator size={16} /> صندوق
        </button>
        <button type="button" className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}>
          <Bot size={16} /> هوش مصنوعی
        </button>
        <button type="button" className={tab === 'sms' ? 'active' : ''} onClick={() => setTab('sms')}>
          <MessageSquare size={16} /> پیامک
        </button>
        <button type="button" className={tab === 'alerts' ? 'active' : ''} onClick={() => setTab('alerts')}>
          <Volume2 size={16} /> اعلان صوتی
        </button>
        <button type="button" className={tab === 'features' ? 'active' : ''} onClick={() => setTab('features')}>
          قابلیت‌ها
        </button>
      </div>

      {tab === 'store' && (
        <div className="settings-grid">
          <section className="card">
            <h3>اطلاعات فروشگاه</h3>
            <div className="form-grid">
              <label className="field">
                <span>نام فروشگاه</span>
                <input value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} />
              </label>
              <label className="field">
                <span>زیرعنوان</span>
                <input value={form.storeSubtitle} onChange={(e) => setForm({ ...form, storeSubtitle: e.target.value })} />
              </label>
              <label className="field field-full">
                <span>آدرس</span>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </label>
              <label className="field">
                <span>تلفن</span>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="field">
                <span>ساعات کاری</span>
                <input value={form.openingHours} onChange={(e) => setForm({ ...form, openingHours: e.target.value })} />
              </label>
              <label className="checkbox-field field-full">
                <input
                  type="checkbox"
                  checked={form.isOpen}
                  onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
                />
                <span>فروشگاه باز است (سفارش‌گیری فعال)</span>
              </label>
              <label className="checkbox-field field-full">
                <input
                  type="checkbox"
                  checked={form.showInstallBanner}
                  onChange={(e) => setForm({ ...form, showInstallBanner: e.target.checked })}
                />
                <span>نمایش بنر نصب PWA</span>
              </label>
              <label className="field">
                <span>تعداد پیشنهاد هوشمند</span>
                <input
                  type="number"
                  min={3}
                  max={12}
                  value={form.smartPicksCount}
                  onChange={(e) => setForm({ ...form, smartPicksCount: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>تگ بستنی پیش‌ساخته (در منو)</span>
                <input
                  value={form.iceCreamPresetTag}
                  onChange={(e) => setForm({ ...form, iceCreamPresetTag: e.target.value })}
                  placeholder="featured"
                  dir="ltr"
                />
              </label>
              <label className="field">
                <span>آستانه هوای گرم (°C)</span>
                <input
                  type="number"
                  value={form.weatherHotThreshold}
                  onChange={(e) => setForm({ ...form, weatherHotThreshold: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>آستانه هوای سرد (°C)</span>
                <input
                  type="number"
                  value={form.weatherColdThreshold}
                  onChange={(e) => setForm({ ...form, weatherColdThreshold: Number(e.target.value) })}
                />
              </label>
            </div>
          </section>
          <section className="card">
            <h3>موقعیت آب‌وهوا</h3>
            <div className="form-grid">
              <label className="field field-full">
                <span>برچسب مکان</span>
                <input
                  value={form.location.label}
                  onChange={(e) =>
                    setForm({ ...form, location: { ...form.location, label: e.target.value } })
                  }
                />
              </label>
              <label className="field">
                <span>عرض جغرافیایی</span>
                <input
                  type="number"
                  step="0.0001"
                  value={form.location.lat}
                  onChange={(e) =>
                    setForm({ ...form, location: { ...form.location, lat: Number(e.target.value) } })
                  }
                  dir="ltr"
                />
              </label>
              <label className="field">
                <span>طول جغرافیایی</span>
                <input
                  type="number"
                  step="0.0001"
                  value={form.location.lon}
                  onChange={(e) =>
                    setForm({ ...form, location: { ...form.location, lon: Number(e.target.value) } })
                  }
                  dir="ltr"
                />
              </label>
            </div>
          </section>
        </div>
      )}

      {tab === 'copy' && (
        <CopySettingsPanel copy={form.copy} onChange={(copy) => setForm({ ...form, copy })} />
      )}

      {tab === 'moods' && (
        <MoodsSettingsPanel moods={form.moods} onChange={(moods) => setForm({ ...form, moods })} />
      )}

      {tab === 'combo' && (
        <ComboRecommendationSettingsPanel
          settings={form.comboRecommendations}
          onChange={(comboRecommendations) => setForm({ ...form, comboRecommendations })}
        />
      )}

      {tab === 'fortune' && (
        <CoffeeFortuneSettingsPanel
          settings={form.coffeeFortuneSettings}
          onChange={(coffeeFortuneSettings) => setForm({ ...form, coffeeFortuneSettings })}
        />
      )}

      {tab === 'appearance' && (
        <AppearanceSettings
          appearance={form.appearance}
          storeName={form.storeName}
          storeSubtitle={form.storeSubtitle}
          onChange={(appearance) => setForm({ ...form, appearance })}
        />
      )}

      {tab === 'home' && (
        <HomeAppearancePanel
          value={form.homeAppearance}
          onChange={(homeAppearance) => setForm({ ...form, homeAppearance })}
        />
      )}

      {tab === 'menu' && (
        <MenuAppearancePanel
          value={form.menuAppearance}
          onChange={(menuAppearance) => setForm({ ...form, menuAppearance })}
        />
      )}

      {tab === 'ai' && <AiSettingsPanel settings={aiForm} onChange={setAiForm} />}

      {tab === 'sms' && <SmsSettingsPanel settings={smsForm} onChange={setSmsForm} />}

      {tab === 'alerts' && <AlertSettingsPanel settings={alertForm} onChange={setAlertForm} />}

      {tab === 'pos' && <PosSettingsPanel value={posForm} onChange={setPosForm} store={form} />}

      {tab === 'features' && (
        <div className="settings-grid">
          <section className="card">
            <h3>قابلیت‌های اپ</h3>
            <div className="feature-list">
              {Object.keys(FEATURE_LABELS).map((key) => (
                <label key={key} className="feature-toggle">
                  <span>{FEATURE_LABELS[key]}</span>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={form.features[key] ?? false}
                      onChange={(e) =>
                        setForm({ ...form, features: { ...form.features, [key]: e.target.checked } })
                      }
                    />
                    <span className="switch-track" />
                  </label>
                </label>
              ))}
            </div>
          </section>

          <section className="card">
            <h3>حالت کیوسک</h3>
            <label className="field">
              <span>زمان بازگشت به صفحه اول در بی‌کاری (ثانیه)</span>
              <input
                type="number"
                min={15}
                max={600}
                value={form.kioskIdleSeconds}
                onChange={(e) => setForm({ ...form, kioskIdleSeconds: Number(e.target.value) })}
              />
            </label>
          </section>

          <ScratchRewardSettingsPanel
            settings={form.scratchReward}
            onChange={(scratchReward) => setForm({ ...form, scratchReward })}
          />

          <WaitLoungeSettingsPanel
            settings={form.waitLounge}
            onChange={(waitLounge) => setForm({ ...form, waitLounge })}
          />
        </div>
      )}
    </div>
  )
}
