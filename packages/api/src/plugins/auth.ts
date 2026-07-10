import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { env } from '../env.js'
import type { UserRole, AuthRole } from '@chill-bar/shared'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authenticateCustomer: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (
      roles: UserRole[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      role: AuthRole
      name?: string | null
      username?: string
      phone?: string | null
      isGuest?: boolean
    }
    user: {
      sub: string
      role: AuthRole
      name?: string | null
      username?: string
      phone?: string | null
      isGuest?: boolean
    }
  }
}

export const authPlugin = fp(async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, { secret: env.jwtSecret })

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'احراز هویت لازم است' })
    }
  })

  app.decorate('requireRole', (roles: UserRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
      } catch {
        return reply.code(401).send({ error: 'احراز هویت لازم است' })
      }
      if (request.user.role === 'CUSTOMER' || !roles.includes(request.user.role as UserRole)) {
        return reply.code(403).send({ error: 'دسترسی کافی ندارید' })
      }
    }
  })

  app.decorate('authenticateCustomer', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'احراز هویت لازم است' })
    }
    if (request.user.role !== 'CUSTOMER') {
      return reply.code(403).send({ error: 'دسترسی مشتری لازم است' })
    }
  })
})
