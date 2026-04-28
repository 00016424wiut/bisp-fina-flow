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

  // Promote admin@flow.com to ADMIN if they exist but aren't ADMIN yet
  const admin = await prisma.user.findFirst({ where: { email: 'admin@flow.com' } })
  if (admin && admin.role !== 'ADMIN') {
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    })
    console.log('Promoted admin@flow.com to ADMIN')
  } else if (admin) {
    console.log('admin@flow.com is already ADMIN')
  }

  const venues = [
    // RESTAURANTS
    { name: 'Azure', category: 'RESTAURANTS' as const, pricePerHour: 400000, capacity: 500, address: 'Almazor district, Usta Alima street 7A', description: 'AZUR - Terrace Garden Welcomes you to Mediterranean restaurant in Tashkent, Uzbekistan! We created a concept with fine cuisine, beautiful architecture, and unique Mediterranean vibes! Our menu features variety of dishes from all the Mediterranean regions. Our chefs use fresh, locally sourced ingredients to create delicious meals that will transport you to the sunny beaches of the Mediterranean sea. From our signature lamb kebabs and Souvlakis to our delicious Paellas and Kuyu tandoor meats, there is something for everyone to enjoy. In addition to our mouthwatering food, our restaurant features a cozy and welcoming atmosphere that will make you feel right at home, you can experience the flavors of the Mediterranean no matter the season', hours: '9:00 - 22:00', rating: 4.5, averageCheck: '400.000 UZS', tags: ['Lounge & Bar', 'Rooftop', 'Party Mode', 'Live Music', 'Parking'], menus: [{ name: 'Azure_Food_Menu_2026' }, { name: 'Azure_Bar_Menu_2026' }] },
    { name: 'Mona Restaturant', category: 'RESTAURANTS' as const, pricePerHour: 250000, capacity: 80, address: 'Tashkent, Yusuf Xos Xojib str, 69', description: '', hours: '12:00 - 01:00', rating: 4.3, averageCheck: '500.000 UZS', tags: ['Live Music', 'Lounge & Bar', 'Chill & Social'], menus: [{ name: 'Mona_Restaurant_Menu_2026' }] },
    { name: 'Quadro', category: 'RESTAURANTS' as const, pricePerHour: 300000, capacity: 200, address: 'Tashkent, Zulfiya xonim str 24', description: 'Первый испанский ресторан в Ташкенте! Создаем моменты, полные тепла и вкуса🧡', hours: '12:00 - 23:00', rating: 4.7, averageCheck: '300.000 UZS', tags: ['Outdoor', 'Party Mode', 'Parking'], menus: [{ name: 'Quadro_Food_Menu_2026' }, { name: 'Quadro_Drinks_Menu_2026' }] },
    // OUTDOOR
    { name: 'Amirsoy', category: 'OUTDOOR' as const, pricePerHour: 900000, capacity: 900, address: 'Tashkent, Bostonlik, Chimgan KFY', description: 'Горный курорт Amirsoy Resort расположен на территории площадью 900 гектаров в одном из красивейших и живописных мест столичной области, на отрогах Чаткальского хребта западной части Тянь-Шаньских гор, всего в 65 километрах от Ташкента.Мы предлагаем широкий круг активных развлечений на любой вкус зимой и летом. Инфраструктура и сервис курорта придутся по душе любому посетителю – от спортсменов-профессионалов и любителей экстрима до самых юных туристов и семейных компаний', hours: '24/7', rating: 4.7, averageCheck: '900.000 UZS', tags: ['Riverside', 'BBQ Area', 'Parking'], menus: [{ name: 'Amirsoy_Menu_2026' }] },
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
    const { menus, ...venueData } = venue
    await prisma.venue.upsert({
      where: {
        id: `seed-${venue.name.toLowerCase().replace(/\s+/g, '-')}`,
      },
      update: {
        ...venueData,
        providerId: provider.id,
        isActive: true,
        // photos and menuUrl are NOT included here — preserves uploads from the site
      },
      create: {
        id: `seed-${venue.name.toLowerCase().replace(/\s+/g, '-')}`,
        ...venueData,
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
