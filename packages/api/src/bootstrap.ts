import { PrismaClient } from '@prisma/client'
import { runSeed } from './seed.js'

const prisma = new PrismaClient()

async function main() {
  const menuItemCount = await prisma.menuItem.count()

  if (menuItemCount === 0) {
    console.log('📦 Empty database — running initial seed...')
    await runSeed()
  } else {
    console.log(
      `📦 Database has ${menuItemCount} menu items — skipping seed (admin edits preserved)`,
    )
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
