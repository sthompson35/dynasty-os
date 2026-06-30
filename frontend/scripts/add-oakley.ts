import { prisma } from '../lib/db'

// Adds the 1215 Oakley Pl foreclosure listing to the seeded demo account
// so the rehab estimator + builder integration can be tested against real data.
// Safe to re-run: finds an existing record by address + userId and updates it
// instead of creating duplicates. Never deletes anything.

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } })
  if (!user) throw new Error('Seeded user test@example.com not found')

  const data = {
    userId: user.id,
    address: '1215 Oakley Pl',
    city: 'Saint Louis',
    state: 'MO',
    zip: '63112',
    propertyType: 'single-family',
    status: 'prospect',
    bedrooms: 4,
    bathrooms: 3,
    sqft: 1920,
    lotSize: 7318,
    yearBuilt: 1906,
    purchasePrice: 90000,
    currentValue: 90000,
    arv: 200000,
    repairCosts: 0,
    photoUrl: 'https://cdn.abacus.ai/images/49ca4ca2-e5f7-4c11-994c-67179c0ad54e.png',
    notes: [
      'Foreclosure — sold as-is. MLS# 26028034 (Benjamin Nichols, Nichols & Associates Real Estate).',
      'Solid stone construction, large rooms, wood-beamed ceiling, double staircase, 3rd-floor bonus room.',
      'Much of the rehab already completed: new kitchen, updated baths, new LVP flooring, some new systems.',
      'Listed at $90,000 · 4 bd / 3 ba · 1,920 sqft · built 1906 · 7,318 sqft lot · ~$47/sqft.',
    ].join('\n'),
  }

  const existing = await prisma.property.findFirst({
    where: { userId: user.id, address: data.address, city: data.city, state: data.state },
  })

  let result
  if (existing) {
    result = await prisma.property.update({ where: { id: existing.id }, data })
    console.log('Updated existing property:', result.id)
  } else {
    result = await prisma.property.create({ data })
    console.log('Created new property:', result.id)
  }

  console.log(JSON.stringify({ id: result.id, address: result.address, status: result.status, photoUrl: result.photoUrl }, null, 2))
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
