import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { loginSchema } from '@chill-bar/shared'
import { prisma } from '../prisma.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'نام کاربری و رمز عبور لازم است' })
    }
    const { username, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !user.isActive) {
      return reply.code(401).send({ error: 'نام کاربری یا رمز عبور اشتباه است' })
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return reply.code(401).send({ error: 'نام کاربری یا رمز عبور اشتباه است' })
    }
    const token = app.jwt.sign(
      { sub: user.id, role: user.role, name: user.name, username: user.username },
      { expiresIn: '12h' },
    )
    return {
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    }
  })

  app.get('/api/auth/me', { onRequest: [app.authenticate] }, async (request) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } })
    if (!user) return { user: null }
    return {
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    }
  })
}
