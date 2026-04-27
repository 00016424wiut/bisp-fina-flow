import prisma from "@bisp-final-flow/db";

// Shared write payload — every editable field on a venue. Used by both
// create (where required fields are enforced by callers) and update (where
// everything is optional).
export type VenueWriteData = {
  name?: string;
  description?: string;
  category?: string;
  pricePerHour?: number;
  capacity?: number;
  address?: string;
  photos?: string[];
  tags?: string[];
  hours?: string;
  duration?: string;
  averageCheck?: string;
  rating?: number;
  amenities?: string[];
  minGuests?: number;
  maxGuests?: number;
  menuUrl?: string | null;
};

// Получить все активные площадки с фильтрами
export async function getVenues(filters: {
  category?: string;
  capacity?: number;
}) {
  return prisma.venue.findMany({
    where: {
      isActive: true,
      ...(filters.category && { category: filters.category as any }),
      ...(filters.capacity && { capacity: { gte: filters.capacity } }),
    },
    include: { provider: { select: { id: true, name: true, email: true } } },
  });
}

// Создать площадку — только PROVIDER
export async function createVenue(
  providerId: string,
  data: VenueWriteData & { name: string; category: string; pricePerHour: number },
) {
  return prisma.venue.create({
    data: {
      name: data.name,
      description: data.description,
      category: data.category as any,
      pricePerHour: data.pricePerHour,
      capacity: data.capacity,
      address: data.address,
      photos: data.photos ?? [],
      tags: data.tags ?? [],
      hours: data.hours,
      duration: data.duration,
      averageCheck: data.averageCheck,
      rating: data.rating,
      amenities: data.amenities ?? [],
      minGuests: data.minGuests,
      maxGuests: data.maxGuests,
      menuUrl: data.menuUrl ?? null,
      providerId,
    },
  });
}

// Обновить площадку. Только владелец может менять. Все поля опциональны.
export async function updateVenue(
  venueId: string,
  providerId: string,
  data: VenueWriteData,
  isAdmin = false,
) {
  const existing = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!existing) {
    throw new Error("Venue not found");
  }
  if (!isAdmin && existing.providerId !== providerId) {
    throw new Error("Forbidden");
  }

  // Build a sparse update payload — only touch fields the client actually sent.
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.category !== undefined) update.category = data.category as any;
  if (data.pricePerHour !== undefined) update.pricePerHour = data.pricePerHour;
  if (data.capacity !== undefined) update.capacity = data.capacity;
  if (data.address !== undefined) update.address = data.address;
  if (data.photos !== undefined) update.photos = data.photos;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.hours !== undefined) update.hours = data.hours;
  if (data.duration !== undefined) update.duration = data.duration;
  if (data.averageCheck !== undefined) update.averageCheck = data.averageCheck;
  if (data.rating !== undefined) update.rating = data.rating;
  if (data.amenities !== undefined) update.amenities = data.amenities;
  if (data.minGuests !== undefined) update.minGuests = data.minGuests;
  if (data.maxGuests !== undefined) update.maxGuests = data.maxGuests;
  if (data.menuUrl !== undefined) update.menuUrl = data.menuUrl;

  return prisma.venue.update({
    where: { id: venueId },
    data: update,
  });
}

export async function toggleVenueActive(venueId: string) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) throw new Error("Venue not found");
  return prisma.venue.update({
    where: { id: venueId },
    data: { isActive: !venue.isActive },
  });
}
