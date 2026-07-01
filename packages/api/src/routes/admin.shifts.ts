import type { FastifyInstance } from 'fastify'
import { shiftOpenSchema, shiftCloseSchema } from '@chill-bar/shared'
import type { UserRole } from '@chill-bar/shared'
import { prisma } from '../prisma.js'
import { loadPosSettings } from '../lib/pos/settings.js'
import { buildShiftReport, serializeShift } from '../lib/pos/shifts.js'

export async function adminShiftRoutes(app: FastifyInstance) {
  app.get(
    '/api/admin/shifts/current',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async () => {
      const shift = await prisma.cashShift.findFirst({
        where: { status: 'OPEN' },
        include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
        orderBy: { openedAt: 'desc' },
      })
      return shift ? serializeShift(shift) : null
    },
  )

  app.get(
    '/api/admin/shifts',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async (request) => {
      const query = request.query as { limit?: string }
      const shifts = await prisma.cashShift.findMany({
        include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
        orderBy: { openedAt: 'desc' },
        take: query.limit ? Number(query.limit) : 50,
      })
      return shifts.map(serializeShift)
    },
  )

  app.post(
    '/api/admin/shifts/open',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async (request, reply) => {
      const parsed = shiftOpenSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
      }

      const settings = await loadPosSettings()
      const role = request.user.role as UserRole
      if (!settings.shiftRoles.includes(role)) {
        return reply.code(403).send({ error: 'اجازه باز کردن شیفت ندارید' })
      }

      const existing = await prisma.cashShift.findFirst({ where: { status: 'OPEN' } })
      if (existing) {
        return reply.code(409).send({ error: 'یک شیفت باز از قبل وجود دارد' })
      }

      const shift = await prisma.cashShift.create({
        data: {
          openingCash: parsed.data.openingCash,
          openedByUserId: request.user.sub,
        },
        include: { openedBy: { select: { name: true } } },
      })

      await prisma.analyticsEvent.create({
        data: { type: 'shift_open', payload: { shiftId: shift.id, userId: request.user.sub } },
      })

      return serializeShift(shift)
    },
  )

  app.post(
    '/api/admin/shifts/:id/close',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const parsed = shiftCloseSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'داده نامعتبر است' })
      }

      const settings = await loadPosSettings()
      const role = request.user.role as UserRole
      if (!settings.shiftRoles.includes(role)) {
        return reply.code(403).send({ error: 'اجازه بستن شیفت ندارید' })
      }

      const shift = await prisma.cashShift.findUnique({
        where: { id },
        include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
      })
      if (!shift) return reply.code(404).send({ error: 'شیفت پیدا نشد' })
      if (shift.status === 'CLOSED') {
        return reply.code(400).send({ error: 'این شیفت قبلاً بسته شده' })
      }

      const orders = await prisma.order.findMany({
        where: { shiftId: id },
        include: { payments: true, adjustments: true },
      })
      const report = buildShiftReport(serializeShift(shift), orders)
      const expectedCash = report.expectedCashInDrawer
      const difference = parsed.data.closingCash - expectedCash

      const closed = await prisma.cashShift.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closingCash: parsed.data.closingCash,
          expectedCash,
          difference,
          notes: parsed.data.notes ?? null,
          closedByUserId: request.user.sub,
          closedAt: new Date(),
        },
        include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
      })

      await prisma.analyticsEvent.create({
        data: {
          type: 'shift_close',
          payload: { shiftId: id, difference, expectedCash, closingCash: parsed.data.closingCash },
        },
      })

      return { shift: serializeShift(closed), report }
    },
  )

  app.get(
    '/api/admin/shifts/:id/report',
    { onRequest: [app.requireRole(['SUPER_ADMIN', 'MANAGER', 'STAFF'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const shift = await prisma.cashShift.findUnique({
        where: { id },
        include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
      })
      if (!shift) return reply.code(404).send({ error: 'شیفت پیدا نشد' })

      const orders = await prisma.order.findMany({
        where: { shiftId: id },
        include: { payments: true, adjustments: true },
      })

      return buildShiftReport(serializeShift(shift), orders)
    },
  )
}
