import prisma from '@bisp-final-flow/db'
import { BookingStatus } from '@bisp-final-flow/db/generated/client'
import type { Booking } from '@bisp-final-flow/db/generated/client'
import { notifyProvider } from "../../lib/telegram";

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      venue: true,
      manager: true,
      expenses: true,
    },
  })
}

export function calculateCost(
  pricePerHour: number,
  startTime: Date,
  endTime: Date
): number {
  const hours = (endTime.getTime() - startTime.getTime()) / 3_600_000
  return Math.round(pricePerHour * hours * 100) / 100
}

// Парсит averageCheck (например "200,000 UZS" / "200.000 UZS" / "1 200 000")
// в чистое число. Возвращает 0 если строка пустая или нечитаемая.
export function parseAverageCheck(value: string | null | undefined): number {
  if (!value) return 0;
  const digits = value.replace(/\D+/g, "");
  return digits ? Number(digits) : 0;
}

// Получить занятые временные слоты для конкретной площадки и даты
export async function getBookedSlots(
  venueId: string,
  date: string
): Promise<{ startTime: string; endTime: string }[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      venueId,
      status: { not: "CANCELLED" },
      startTime: { gte: startOfDay, lte: endOfDay },
    },
    select: { startTime: true, endTime: true },
  });

  return bookings.map(b => ({
    startTime: `${String(b.startTime.getHours()).padStart(2, "0")}:${String(b.startTime.getMinutes()).padStart(2, "0")}`,
    endTime: `${String(b.endTime.getHours()).padStart(2, "0")}:${String(b.endTime.getMinutes()).padStart(2, "0")}`,
  }));
}


export async function confirmBooking(
  bookingId: string,
  companyId: string
): Promise<Booking> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CONFIRMED },
      include: { venue: true },
    })

    await tx.expense.create({
      data: {
        amount:      booking.cost,
        category:    booking.venue.category,
        description: `Бронирование: ${booking.venue.name}`,
        bookingId:   booking.id,
        companyId,
      },
    })

    // Находим провайдера и отправляем уведомление
    const provider = await tx.user.findUnique({
      where: { id: booking.venue.providerId },
    })

    if (provider) {
      await notifyProvider(
        provider.telegramChatId,
        provider.telegramUsername,
        `<b>Бронирование подтверждено!</b>\n` +
        `Площадка: ${booking.venue.name}\n` +
        `Дата: ${booking.startTime.toLocaleDateString("ru-RU")}\n` +
        `Стоимость: ${booking.cost}`
      )
    }

    return booking
  })
}

export async function createBooking(
  managerId: string,
  companyId: string,
  data: {
    venueId: string;
    startTime: string;
    endTime: string;
    eventName?: string;
    notes?: string;
    guestCount?: number;
  }
): Promise<Booking> {
  const venue = await prisma.venue.findUnique({
    where: { id: data.venueId },
  })

  if (!venue) {
    throw new Error("Venue not found")
  }

  const startTime = new Date(data.startTime)
  const endTime = new Date(data.endTime)

  // Новая формула: averageCheck × guestCount.
  // Fallback на pricePerHour × hours, если у площадки нет averageCheck
  // (например мастер-классы / активности с почасовой оплатой).
  const guests = data.guestCount ?? 1
  const avg = parseAverageCheck(venue.averageCheck)
  const cost =
    avg > 0
      ? avg * guests
      : calculateCost(Number(venue.pricePerHour), startTime, endTime)

  return prisma.booking.create({
    data: {
      managerId,
      companyId,
      venueId: data.venueId,
      startTime,
      endTime,
      cost,
      eventName: data.eventName,
      notes: data.notes,
      guestCount: data.guestCount,
      status: BookingStatus.PENDING,
    },
  })
}

// Менеджер отменяет своё бронирование. Только своё, только если оно ещё не отменено.
// Если по нему уже создан Expense (значит был CONFIRMED) — удаляем его в той же транзакции,
// чтобы аналитика не показывала несостоявшийся расход.
export async function cancelBooking(
  bookingId: string,
  managerId: string
): Promise<Booking> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.booking.findUnique({
      where: { id: bookingId },
    });

    if (!existing) {
      throw new Error("Booking not found");
    }
    if (existing.managerId !== managerId) {
      throw new Error("Forbidden");
    }
    if (existing.status === BookingStatus.CANCELLED) {
      return existing;
    }

    await tx.expense.deleteMany({ where: { bookingId } });

    return tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });
  });
}

export async function getMyBookings(managerId: string) {
  return prisma.booking.findMany({
    where: { managerId },
    include: { venue: true },
    orderBy: { createdAt: "desc" },
  });
}
