import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../prisma.js'

const userInputSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  password: z.string().min(6).optional(),
  role: z.enum(['SUPER_ADMIN', 'MANAGER', 'STAFF']),
  isActive: z.boolean().default(true),
})

export async function adminUserRoutes(app: FastifyInstance) {
  const superAdmin = { onRequest: [app.requireRole(['SUPER_ADMIN'])] }

  app.get('/api/admin/users', superAdmin, async () => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      isActive: u.isActive,
    }))
  })

  app.post('/api/admin/users', superAdmin, async (request, reply) => {
    const parsed = userInputSchema.safeParse(request.body)
    if (!parsed.success || !parsed.data.password) {
      return reply.code(400).send({ error: 'اطلاعات کاربر نامعتبر است' })
    }
    const hashed = await bcrypt.hash(parsed.data.password, 10)
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
        password: hashed,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
      },
    })
    return reply.code(201).send({
      id: created.id,
      name: created.name,
      username: created.username,
      role: created.role,
      isActive: created.isActive,
    })
  })

  app.put('/api/admin/users/:id', superAdmin, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = userInputSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'اطلاعات کاربر نامعتبر است' })
    const data: Record<string, unknown> = {
      name: parsed.data.name,
      username: parsed.data.username,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    }
    if (parsed.data.password) {
      data.password = await bcrypt.hash(parsed.data.password, 10)
    }
    const updated = await prisma.user.update({ where: { id }, data })
    return {
      id: updated.id,
      name: updated.name,
      username: updated.username,
      role: updated.role,
      isActive: updated.isActive,
    }
  })

  app.delete('/api/admin/users/:id', superAdmin, async (request, reply) => {
    const { id } = request.params as { id: string }
    if (request.user.sub === id) {
      return reply.code(400).send({ error: 'نمی‌توانید حساب خودتان را حذف کنید' })
    }
    await prisma.user.delete({ where: { id } })
    return reply.code(204).send()
  })
}
