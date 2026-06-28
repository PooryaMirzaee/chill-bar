import type { WebSocket } from '@fastify/websocket'

type ChannelName = 'admin' | 'orders'

interface Client {
  socket: WebSocket
  channels: Set<ChannelName>
}

const clients = new Set<Client>()

export function registerClient(socket: WebSocket, channels: ChannelName[]): Client {
  const client: Client = { socket, channels: new Set(channels) }
  clients.add(client)
  socket.on('close', () => clients.delete(client))
  socket.on('error', () => clients.delete(client))
  return client
}

export function broadcast(channel: ChannelName, type: string, payload: unknown) {
  const message = JSON.stringify({ type, payload, at: new Date().toISOString() })
  for (const client of clients) {
    if (!client.channels.has(channel)) continue
    if (client.socket.readyState === 1) {
      try {
        client.socket.send(message)
      } catch {
        clients.delete(client)
      }
    }
  }
}
