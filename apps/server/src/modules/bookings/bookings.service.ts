// Импортируем всё из одного места — никаких лишних зависимостей
import {
    prisma,
    BookingStatus,
    type Booking,
    type BookingWithRelations,
  } from '@bisp-final-flow/db'
  
  // Возвращаемый тип явно указан — автокомплит работает везде,
  // где используется результат этой функции
  export async function getBookingById(
    id: string
  ): Promise<BookingWithRelations | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        venue: true,     // подгружаем площадку
        manager: true,   // подгружаем менеджера
        expenses: true,  // подгружаем расходы
      },
    })
  }
  
  // Авторасчёт стоимости: pricePerHour × количество часов
  export function calculateCost(
    pricePerHour: number,
    startTime: Date,
    endTime: Date
  ): number {
    const hours = (endTime.getTime() - startTime.getTime()) / 3_600_000
    return Math.round(pricePerHour * hours * 100) / 100 // округляем до копеек
  }
  
  // Смена статуса + автосоздание Expense при CONFIRMED
  export async function confirmBooking(
    bookingId: string,
    companyId: string
  ): Promise<Booking> {
    // Prisma транзакция: либо всё, либо ничего
    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
        include: { venue: true },
      })
  
      // Создаём расход автоматически
      await tx.expense.create({
        data: {
          amount:      booking.cost,
          category:    booking.venue.category,
          description: `Бронирование: ${booking.venue.name}`,
          bookingId:   booking.id,
          companyId,
        },
      })
  
      return booking
    })
  }
  