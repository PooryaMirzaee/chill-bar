import type { FastifyInstance } from 'fastify'
import {
  loadIceCreamOptions,
  mapIceCreamOption,
} from '../lib/iceCream.js'

export async function iceCreamRoutes(app: FastifyInstance) {
  app.get('/api/ice-cream/options', async () => {
    const data = await loadIceCreamOptions(true)
    if (!data.enabled) {
      return { ...data, bases: [], coatings: [], fillings: [] }
    }
    return data
  })
}
