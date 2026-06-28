import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { UserRole } from '@chill-bar/shared'

import { api } from '../lib/api'

interface AdminUserRow {
  id: string
  name: string
  username: string
  role: UserRole
  isActive: boolean
}

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'مدیر کل',
  MANAGER: 'مدیر',
  STAFF: 'کارمند',
}

const emptyForm = {
  id: '',
  name: '',
  username: '',
  password: '',
  role: 'STAFF' as UserRole,
  isActive: true,
}

export function Users() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<typeof emptyForm | null>(null)
  const [error, setError] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api<AdminUserRow[]>('/api/admin/users'),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] })

  const saveMutation = useMutation({
    mutationFn: (data: typeof emptyForm) => {
      const body = JSON.stringify({
        name: data.name,
        username: data.username,
        role: data.role,
        isActive: data.isActive,
        ...(data.password ? { password: data.password } : {}),
      })
      return data.id
        ? api(`/api/admin/users/${data.id}`, { method: 'PUT', body })
        : api('/api/admin/users', { method: 'POST', body })
    },
    onSuccess: () => {
      invalidate()
      setForm(null)
      setError('')
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'خطا'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>کاربران پنل</h1>
          <p className="page-sub">مدیریت دسترسی کارکنان</p>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={() => setForm({ ...emptyForm })}>
            <Plus size={18} /> کاربر جدید
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="card skeleton" style={{ height: 240 }} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>نام</th>
                <th>نام کاربری</th>
                <th>نقش</th>
                <th>وضعیت</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {u.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn-sm"
                        onClick={() =>
                          setForm({
                            id: u.id,
                            name: u.name,
                            username: u.username,
                            password: '',
                            role: u.role,
                            isActive: u.isActive,
                          })
                        }
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn-sm danger"
                        onClick={() => {
                          if (confirm(`حذف کاربر «${u.name}»؟`)) deleteMutation.mutate(u.id)
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>{form.id ? 'ویرایش کاربر' : 'کاربر جدید'}</h3>
              <button className="icon-btn" onClick={() => setForm(null)}>
                ✕
              </button>
            </header>
            <div className="modal-body form-grid">
              <label className="field">
                <span>نام</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="field">
                <span>نام کاربری</span>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </label>
              <label className="field">
                <span>رمز عبور {form.id && '(خالی = بدون تغییر)'}</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <label className="field">
                <span>نقش</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                >
                  <option value="STAFF">کارمند</option>
                  <option value="MANAGER">مدیر</option>
                  <option value="SUPER_ADMIN">مدیر کل</option>
                </select>
              </label>
              <label className="checkbox-field field-full">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span>حساب فعال است</span>
              </label>
              {error && <div className="login-error field-full">{error}</div>}
            </div>
            <footer className="modal-foot">
              <button className="btn-ghost" onClick={() => setForm(null)}>
                انصراف
              </button>
              <button
                className="btn-primary"
                disabled={!form.name || !form.username || (!form.id && !form.password)}
                onClick={() => saveMutation.mutate(form)}
              >
                ذخیره
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
