import { PrismaClient } from '../prisma/generated/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Find an existing provider, or create a system provider for seed data
  let provider = await prisma.user.findFirst({
    where: { role: 'PROVIDER' }
  })

  if (!provider) {
    console.log('No PROVIDER user found — creating a system provider for seed data...')

    const company = await prisma.company.create({
      data: { name: 'FLOW Venues' },
    })

    provider = await prisma.user.create({
      data: {
        id: 'system-provider',
        name: 'FLOW Venues',
        email: 'venues@flow.local',
        role: 'PROVIDER',
        companyId: company.id,
      },
    })
  }

  // Create admin user if none exists
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    console.log('No ADMIN user found — creating a system admin...')
    const adminCompany = await prisma.company.create({
      data: { name: 'FLOW Admin' },
    })
    await prisma.user.create({
      data: {
        id: 'system-admin',
        name: 'FLOW Admin',
        email: 'admin@flow.local',
        role: 'ADMIN',
        companyId: adminCompany.id,
      },
    })
  }

  const venues = [
    // RESTAURANTS
    { name: 'Sky Lounge', category: 'RESTAURANTS' as const, pricePerHour: 400000, capacity: 500, address: 'Turkiston street 12A', description: 'Роскошный лаундж на крыше с панорамным видом на город. Авторская кухня, живая музыка по выходным.', hours: '9:00 - 22:00', rating: 4.5, averageCheck: '400.000 UZS', tags: ['Lounge & Bar', 'Rooftop', 'Party Mode', 'Live Music', 'Parking'], menus: [{ name: 'SkyLounge_Food_Menu_2026' }, { name: 'SkyLounge_Bar_Menu_2026' }] },
    { name: 'Jazz Bar', category: 'RESTAURANTS' as const, pricePerHour: 250000, capacity: 80, address: 'Amir Temur 5', description: 'Уютный джаз-бар в сердце города. Живая музыка каждый вечер, авторские коктейли.', hours: '18:00 - 02:00', rating: 4.3, averageCheck: '250.000 UZS', tags: ['Live Music', 'Lounge & Bar', 'Chill & Social'], menus: [{ name: 'JazzBar_Menu_2026' }] },
    { name: 'Garden Terrace', category: 'RESTAURANTS' as const, pricePerHour: 300000, capacity: 200, address: 'Yunusabad 3', description: 'Открытая терраса в зелёном саду. Идеальное место для свадеб и корпоративных мероприятий.', hours: '10:00 - 22:00', rating: 4.7, averageCheck: '300.000 UZS', tags: ['Outdoor', 'Party Mode', 'Parking'], menus: [{ name: 'GardenTerrace_Food_Menu_2026' }, { name: 'GardenTerrace_Drinks_Menu_2026' }] },
    // OUTDOOR
    { name: 'Riverside Club', category: 'OUTDOOR' as const, pricePerHour: 300000, capacity: 100, address: 'Bozsuv 1', description: 'Клуб на берегу реки с живописным видом. Большая терраса, зона для барбекю.', hours: '10:00 - 22:00', rating: 4.7, averageCheck: '300.000 UZS', tags: ['Riverside', 'BBQ Area', 'Parking'], menus: [{ name: 'RiversideClub_Menu_2026' }] },
    { name: 'Villa Oasis', category: 'OUTDOOR' as const, pricePerHour: 800000, capacity: 200, address: 'Tashkent suburbs', description: 'Роскошная вилла с бассейном и садом. Полная приватность, собственный шеф-повар.', hours: '9:00 - 23:00', rating: 4.9, averageCheck: '800.000 UZS', tags: ['Private Villa', 'Poolside Garden', 'Parking'], menus: [{ name: 'VillaOasis_Food_Menu_2026' }, { name: 'VillaOasis_Bar_Menu_2026' }] },
    // MASTER_CLASSES
    { name: 'Chef Studio', category: 'MASTER_CLASSES' as const, pricePerHour: 80, capacity: 12, address: 'Amir Temur 12', description: 'Кулинарная студия с профессиональным оборудованием. Мастер-классы от шеф-поваров.', hours: '10:00 - 18:00', rating: 4.8, duration: '3 hours', tags: ['Cooking'], menus: [] },
    { name: 'Art Lab', category: 'MASTER_CLASSES' as const, pricePerHour: 60, capacity: 15, address: 'Navoi 3', description: 'Творческая студия для арт-мастер-классов. Живопись, скетчинг, акварель.', hours: '11:00 - 19:00', rating: 4.6, duration: '2 hours', tags: ['Art & Craft'], menus: [] },
    // ACTIVITIES
    { name: 'Quest Zone', category: 'ACTIVITIES' as const, pricePerHour: 40, capacity: 6, address: 'Chilanzar 5', description: 'Живые квесты с профессиональными актёрами. 5 сценариев на выбор.', hours: '10:00 - 22:00', rating: 4.7, duration: '1 hour', tags: ['Live Quest'], menus: [] },
    { name: 'Bowling Center', category: 'ACTIVITIES' as const, pricePerHour: 30, capacity: 20, address: 'Yakkasaray 7', description: 'Современный боулинг-центр с 12 дорожками. Прокат обуви включён.', hours: '11:00 - 23:00', rating: 4.4, duration: 'flexible', tags: ['Bowling'], menus: [] },
    // GIFTS
    { name: 'Sweet Box', category: 'GIFTS' as const, pricePerHour: 20, capacity: 1, address: 'Amir Temur 2', description: 'Авторские шоколадные наборы ручной работы. Персонализированные коробки.', hours: '9:00 - 20:00', rating: 4.6, tags: ['Chocolate'], menus: [] },
    { name: 'Flower Lab', category: 'GIFTS' as const, pricePerHour: 40, capacity: 1, address: 'Navoi 1', description: 'Флористическая лаборатория с авторскими букетами. Живые и сухоцветы.', hours: '8:00 - 20:00', rating: 4.8, tags: ['Flowers'], menus: [] },
  ]

  for (const venue of venues) {
    await prisma.venue.upsert({
      where: {
        id: `seed-${venue.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {
        ...venue,
        providerId: provider.id,
        isActive: true,
      },
      create: {
        id: `seed-${venue.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...venue,
        providerId: provider.id,
        isActive: true,
      },
    })
  }

  console.log('✅ Seed complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
