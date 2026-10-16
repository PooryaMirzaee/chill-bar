import { prisma } from '../prisma.js'

export const MALL_PASS_TEMPLATE_KEY = 'mall_pass_template'

export interface MallPassTemplate {
  version: 1
  width: number
  height: number
  /** Fabric.js canvas JSON */
  fabricJson: Record<string, unknown>
  updatedAt?: string
}

export const DEFAULT_PASS_SIZE = { width: 1080, height: 1620 }

export async function loadMallPassTemplate(): Promise<MallPassTemplate | null> {
  const row = await prisma.setting.findUnique({ where: { key: MALL_PASS_TEMPLATE_KEY } })
  if (!row?.value || typeof row.value !== 'object') return null
  const v = row.value as Partial<MallPassTemplate>
  if (!v.fabricJson || typeof v.fabricJson !== 'object') return null
  return {
    version: 1,
    width: typeof v.width === 'number' ? v.width : DEFAULT_PASS_SIZE.width,
    height: typeof v.height === 'number' ? v.height : DEFAULT_PASS_SIZE.height,
    fabricJson: v.fabricJson as Record<string, unknown>,
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : undefined,
  }
}

export async function saveMallPassTemplate(template: MallPassTemplate): Promise<MallPassTemplate> {
  const payload: MallPassTemplate = {
    version: 1,
    width: template.width || DEFAULT_PASS_SIZE.width,
    height: template.height || DEFAULT_PASS_SIZE.height,
    fabricJson: template.fabricJson,
    updatedAt: new Date().toISOString(),
  }
  await prisma.setting.upsert({
    where: { key: MALL_PASS_TEMPLATE_KEY },
    update: { value: payload as unknown as object },
    create: { key: MALL_PASS_TEMPLATE_KEY, value: payload as unknown as object },
  })
  return payload
}
