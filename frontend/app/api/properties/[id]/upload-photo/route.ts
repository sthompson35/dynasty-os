import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''
  if (!userId) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const propertyId = params?.id ?? ''
  const property = await prisma.property.findFirst({ where: { id: propertyId, userId } })
  if (!property) return NextResponse.json({ error: 'Property not found.' }, { status: 404 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  const typedFile = file as File
  if (!typedFile.type?.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed.' }, { status: 400 })
  }
  if (typedFile.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 15MB.' }, { status: 400 })
  }

  try {
    const ext = typedFile.name?.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${propertyId}-${Date.now()}.${ext}`
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'photos')
    await mkdir(uploadDir, { recursive: true })
    const filepath = path.join(uploadDir, filename)
    const buffer = Buffer.from(await typedFile.arrayBuffer())
    await writeFile(filepath, buffer)

    const publicUrl = `/uploads/photos/${filename}`

    const existingImages = await prisma.propertyImage.findMany({ where: { propertyId } })
    const isPrimary = existingImages.length === 0
    const sortOrder = existingImages.length

    const image = await prisma.propertyImage.create({
      data: {
        propertyId,
        userId,
        url: publicUrl,
        cloudStoragePath: publicUrl,
        isPrimary,
        sortOrder,
      },
    })

    if (isPrimary) {
      await prisma.property.update({ where: { id: propertyId }, data: { photoUrl: publicUrl } })
    }

    const allImages = await prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    })

    return NextResponse.json({
      image,
      images: allImages.map(img => ({
        id: img.id,
        propertyId: img.propertyId,
        url: img.url,
        cloudStoragePath: img.cloudStoragePath,
        caption: img.caption,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
        createdAt: img.createdAt.toISOString(),
      })),
    }, { status: 201 })
  } catch (error) {
    console.error('Photo upload failed', error)
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 })
  }
}
