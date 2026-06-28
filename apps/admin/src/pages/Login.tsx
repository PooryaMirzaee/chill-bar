import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../lib/auth'

export function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    navigate('/', { replace: true })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-ambient" />
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">C</div>
        <h1>پنل مدیریت Chill Bar</h1>
        <p className="login-sub">برای ورود اطلاعات حساب خود را وارد کنید</p>

        <label className="field">
          <span>نام کاربری</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="admin"
            required
          />
        </label>
        <label className="field">
          <span>رمز عبور</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button className="btn-primary login-btn" type="submit" disabled={loading}>
          <LogIn size={18} />
          {loading ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>
    </div>
  )
}
