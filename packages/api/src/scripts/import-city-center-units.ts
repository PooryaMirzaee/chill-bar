/**
 * Import City Center units + create membership codes.
 * Usage: npx tsx src/scripts/import-city-center-units.ts [path-to-units.json]
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../prisma.js'
import { ensureUniqueMembershipCode } from '../lib/mallClub.js'
import { loadSettings } from '../lib/storeSettings.js'
import { mergeMallClubSettings } from '@chill-bar/shared'

interface SeedUnit {
  unitCode: string
  name: string
  floor?: string | null
  category?: string | null
  usage?: string | null
  managerName?: string | null
  managerPhone?: string | null
  unitPhone?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
  tenantName?: string | null
  contactName?: string | null
  contactPhone?: string | null
  meta?: Record<string, unknown>
}

interface SeedFile {
  complex: { slug: string; name: string }
  units: SeedUnit[]
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url))
  const defaultPath = resolve(here, '../../data/city-center/units.json')
  const path = resolve(process.argv[2] ?? defaultPath)
  const raw = JSON.parse(readFileSync(path, 'utf8')) as SeedFile
  const settings = await loadSettings()
  const mall = mergeMallClubSettings(settings.mallClub)
  const defaultDiscount = mall.defaultDiscountPercent
  const defaultCredit = mall.defaultCreditLimit

  const complex = await prisma.mallComplex.upsert({
    where: { slug: raw.complex.slug || mall.complexSlug },
    create: {
      slug: raw.complex.slug || mall.complexSlug,
      name: raw.complex.name || mall.complexName,
      isActive: true,
    },
    update: { name: raw.complex.name || mall.complexName, isActive: true },
  })

  let createdUnits = 0
  let updatedUnits = 0
  let createdMemberships = 0

  for (const u of raw.units) {
    if (!u.unitCode?.trim()) continue
    const existing = await prisma.mallUnit.findUnique({
      where: { complexId_unitCode: { complexId: complex.id, unitCode: u.unitCode } },
      include: { membership: true },
    })

    const data = {
      name: u.name || u.unitCode,
      floor: u.floor ?? null,
      category: u.category ?? null,
      usage: u.usage ?? null,
      managerName: u.managerName ?? null,
      managerPhone: u.managerPhone ?? null,
      unitPhone: u.unitPhone ?? null,
      ownerName: u.ownerName ?? null,
      ownerPhone: u.ownerPhone ?? null,
      tenantName: u.tenantName ?? null,
      contactName: u.contactName ?? u.managerName ?? null,
      contactPhone: u.contactPhone ?? u.managerPhone ?? null,
      isActive: true,
      meta: (u.meta ?? {}) as object,
    }

    let unitId: string
    if (existing) {
      await prisma.mallUnit.update({ where: { id: existing.id }, data })
      unitId = existing.id
      updatedUnits++
      if (!existing.membership) {
        const code = await ensureUniqueMembershipCode(u.unitCode)
        await prisma.mallMembership.create({
          data: {
            code,
            unitId,
            status: 'ACTIVE',
            discountPercent: defaultDiscount,
            creditLimit: defaultCredit,
            contactName: data.contactName,
            contactPhone: data.contactPhone,
          },
        })
        createdMemberships++
      }
    } else {
      const code = await ensureUniqueMembershipCode(u.unitCode)
      const unit = await prisma.mallUnit.create({
        data: {
          complexId: complex.id,
          unitCode: u.unitCode,
          ...data,
          membership: {
            create: {
              code,
              status: 'ACTIVE',
              discountPercent: defaultDiscount,
              creditLimit: defaultCredit,
              contactName: data.contactName,
              contactPhone: data.contactPhone,
            },
          },
        },
      })
      unitId = unit.id
      createdUnits++
      createdMemberships++
      void unitId
    }
  }

  console.log(
    JSON.stringify(
      {
        complex: complex.slug,
        createdUnits,
        updatedUnits,
        createdMemberships,
        totalUnits: await prisma.mallUnit.count({ where: { complexId: complex.id } }),
        totalMemberships: await prisma.mallMembership.count({
          where: { unit: { complexId: complex.id } },
        }),
      },
      null,
      2,
    ),
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
