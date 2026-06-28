import type { FastifyInstance } from 'fastify'
import { registerClient } from '../ws.js'

export async function wsRoutes(app: FastifyInstance) {
  // Admin realtime feed (new orders, status changes)
  app.get('/ws/admin', { websocket: true }, (socket) => {
    registerClient(socket, ['admin'])
    socket.send(JSON.stringify({ type: 'connected', payload: { channel: 'admin' } }))
  })

  // Customer order status feed
  app.get('/ws/orders', { websocket: true }, (socket) => {
    registerClient(socket, ['orders'])
    socket.send(JSON.stringify({ type: 'connected', payload: { channel: 'orders' } }))
  })
}
