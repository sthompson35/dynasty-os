import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { serializeContact } from '@/lib/contact-utils'
import { AppNavigation } from '@/components/dynasty/app-navigation'
import { ContactsManager } from '@/components/dynasty/contacts-manager'

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id ?? ''

  if (!userId) {
    redirect('/login')
  }

  const contacts = await prisma.contact.findMany({
    where: { userId },
    include: {
      links: {
        include: {
          property: {
            select: { id: true, address: true, city: true, state: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: [{ name: 'asc' }],
  })

  return (
    <main className="min-h-screen dynasty-shell pb-10">
      <AppNavigation userName={session?.user?.name ?? 'Investor'} userEmail={session?.user?.email ?? ''} />
      <ContactsManager initialContacts={contacts?.map?.((contact: unknown) => serializeContact(contact)) ?? []} />
    </main>
  )
}
