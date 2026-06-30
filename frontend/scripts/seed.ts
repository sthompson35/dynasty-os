import bcrypt from 'bcryptjs'
import { prisma } from '../lib/db'

type SeedProperty = {
  id: string
  address: string
  city: string
  state: string
  zip: string
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSize: number | null
  yearBuilt: number | null
  purchasePrice: number
  currentValue: number
  status: string
  notes: string
  arv: number
  repairCosts: number
  holdingCosts: number
  closingCosts: number
  photoUrl: string
}

const sampleProperties: SeedProperty[] = [
  {
    id: 'oak-terrace-reposition',
    address: '1842 Oak Terrace Drive',
    city: 'Dallas',
    state: 'TX',
    zip: '75208',
    propertyType: 'single-family',
    bedrooms: 4,
    bathrooms: 2.5,
    sqft: 2380,
    lotSize: 0.18,
    yearBuilt: 1988,
    purchasePrice: 246000,
    currentValue: 318000,
    status: 'owned',
    notes: 'Cosmetic value-add with strong resale demand and clean neighborhood comps.',
    arv: 365000,
    repairCosts: 42000,
    holdingCosts: 9200,
    closingCosts: 11800,
    photoUrl: 'https://assets.drbhomes.com/ndg-cms-prod-assets/image/1758576001022.jpg',
  },
  {
    id: 'heritage-duplex-income',
    address: '720 Heritage Lane',
    city: 'Fort Worth',
    state: 'TX',
    zip: '76104',
    propertyType: 'multi-family',
    bedrooms: 6,
    bathrooms: 4,
    sqft: 3125,
    lotSize: 0.24,
    yearBuilt: 1974,
    purchasePrice: 382000,
    currentValue: 455000,
    status: 'under-contract',
    notes: 'Duplex with upside through rent normalization and light exterior refresh.',
    arv: 520000,
    repairCosts: 56000,
    holdingCosts: 13500,
    closingCosts: 16200,
    photoUrl: 'https://images.adsttc.com/media/images/5eec/1900/b357/654b/de00/0095/large_jpg/DUPLEX-51.jpg?1592531180',
  },
  {
    id: 'cedar-infill-land',
    address: '55 Cedar Bend Road',
    city: 'McKinney',
    state: 'TX',
    zip: '75069',
    propertyType: 'land',
    bedrooms: null,
    bathrooms: null,
    sqft: null,
    lotSize: 1.35,
    yearBuilt: null,
    purchasePrice: 128000,
    currentValue: 154000,
    status: 'prospect',
    notes: 'Infill lot candidate for small residential development or entitlement hold.',
    arv: 240000,
    repairCosts: 18500,
    holdingCosts: 6800,
    closingCosts: 6200,
    photoUrl: 'https://images.squarespace-cdn.com/content/v1/5a8b95bd90bade54a78b3219/1754513739944-811DXSJ7KICTOO8ZPY6U/1729685422937.jpg',
  },
  {
    id: 'bronzeville-townhome',
    address: '309 Dynasty Court',
    city: 'Houston',
    state: 'TX',
    zip: '77004',
    propertyType: 'other',
    bedrooms: 3,
    bathrooms: 3.5,
    sqft: 2050,
    lotSize: 0.08,
    yearBuilt: 2012,
    purchasePrice: 334000,
    currentValue: 349000,
    status: 'sold',
    notes: 'Tight-margin townhome disposition used as a benchmark for break-even discipline.',
    arv: 372000,
    repairCosts: 18000,
    holdingCosts: 12100,
    closingCosts: 14600,
    photoUrl: 'https://www.nichiha.com/uploads/7-Modern-Homes-Using-Wall-Paneling-Right/Nichiha-ArchitecturalBlock-Modern.jpg?t=1629137943',
  },
]

async function upsertInvestor(email: string, password: string, name: string, role: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: passwordHash,
      role,
    },
    create: {
      email,
      name,
      password: passwordHash,
      role,
    },
  })
}

async function seedPortfolio(userId: string, prefix: string) {
  for (const property of sampleProperties) {
    const propertyId = `${prefix}-${property.id}`
    await prisma.property.upsert({
      where: { id: propertyId },
      update: {
        userId,
        address: property.address,
        city: property.city,
        state: property.state,
        zip: property.zip,
        propertyType: property.propertyType,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        lotSize: property.lotSize,
        yearBuilt: property.yearBuilt,
        purchasePrice: property.purchasePrice,
        currentValue: property.currentValue,
        status: property.status,
        photoUrl: property.photoUrl,
        notes: property.notes,
        arv: property.arv,
        repairCosts: property.repairCosts,
        holdingCosts: property.holdingCosts,
        closingCosts: property.closingCosts,
      },
      create: {
        id: propertyId,
        userId,
        address: property.address,
        city: property.city,
        state: property.state,
        zip: property.zip,
        propertyType: property.propertyType,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        sqft: property.sqft,
        lotSize: property.lotSize,
        yearBuilt: property.yearBuilt,
        purchasePrice: property.purchasePrice,
        currentValue: property.currentValue,
        status: property.status,
        photoUrl: property.photoUrl,
        notes: property.notes,
        arv: property.arv,
        repairCosts: property.repairCosts,
        holdingCosts: property.holdingCosts,
        closingCosts: property.closingCosts,
      },
    })
  }
}

async function main() {
  const demoInvestor = await upsertInvestor('test@example.com', 'password123', 'Demo Investor', 'INVESTOR')
  const platformAdmin = await upsertInvestor('john@doe.com', 'johndoe123', 'John Doe', 'ADMIN')

  await seedPortfolio(demoInvestor.id, 'demo')
  await seedPortfolio(platformAdmin.id, 'admin')
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })