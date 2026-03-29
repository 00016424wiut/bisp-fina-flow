export type Venue = {
    id: number;
    name: string;
    hours: string;
    location: string;
    rating: number;
    filter: string;
    price?: number;
    capacity?: number;
    photos?: string[];
  };
  
  export type Category = {
    title: string;
    filters: string[];
    venues: Venue[];
  };
  
  export const categories: Record<string, Category> = {
    restaurants: {
      title: "Restaurants",
      filters: [
        "Lounge & Bar", "Rooftop", "Private Loft", "Cafe & Terrace",
        "Party Mode", "Chill & Social", "Modern Classic", "Industrial",
        "Outdoor", "Karaoke Room", "Live Music", "Dancefloor", "DJ Set", "Parking",
      ],
      venues: [
        { id: 1, name: "Sky Lounge", hours: "9:00 - 22:00", location: "Tashkent street 12A", rating: 4.5, filter: "Rooftop", price: 150, capacity: 50 },
        { id: 2, name: "Jazz Bar", hours: "18:00 - 02:00", location: "Amir Temur 5", rating: 4.3, filter: "Live Music", price: 80, capacity: 30 },
        { id: 3, name: "Garden Terrace", hours: "10:00 - 22:00", location: "Yunusabad 3", rating: 4.7, filter: "Outdoor", price: 100, capacity: 80 },
        { id: 4, name: "Private Loft 404", hours: "12:00 - 23:00", location: "Chilanzar 7", rating: 4.2, filter: "Private Loft", price: 120, capacity: 20 },
        { id: 5, name: "Industrial Space", hours: "14:00 - 00:00", location: "Mirzo Ulugbek 1", rating: 4.8, filter: "Industrial", price: 200, capacity: 150 },
        { id: 6, name: "Chill Corner", hours: "9:00 - 21:00", location: "Shaykhantahur 4", rating: 4.4, filter: "Chill & Social", price: 60, capacity: 25 },
        { id: 7, name: "Karaoke Night", hours: "18:00 - 03:00", location: "Yakkasaray 2", rating: 4.6, filter: "Karaoke Room", price: 90, capacity: 15 },
        { id: 8, name: "Rooftop Party", hours: "20:00 - 04:00", location: "Hamza 8", rating: 4.1, filter: "Rooftop", price: 180, capacity: 60 },
        { id: 9, name: "Classic Bistro", hours: "9:00 - 22:00", location: "Navoi 10", rating: 4.9, filter: "Modern Classic", price: 110, capacity: 40 },
      ],
    },
  
    outdoor: {
      title: "Outdoor",
      filters: [
        "Riverside", "Poolside Garden", "Private Villa",
        "Summer Vibes", "Evening Lights", "Taptchan / Low Seating", "BBQ Area",
      ],
      venues: [
        { id: 1, name: "Riverside Club", hours: "10:00 - 22:00", location: "Bozsuv 1", rating: 4.7, filter: "Riverside", price: 130, capacity: 100 },
        { id: 2, name: "Villa Oasis", hours: "9:00 - 23:00", location: "Tashkent suburbs", rating: 4.9, filter: "Private Villa", price: 300, capacity: 200 },
        { id: 3, name: "BBQ Garden", hours: "12:00 - 22:00", location: "Yunusabad 5", rating: 4.5, filter: "BBQ Area", price: 90, capacity: 50 },
        { id: 4, name: "Pool Party Zone", hours: "11:00 - 21:00", location: "Mirzo Ulugbek 3", rating: 4.6, filter: "Poolside Garden", price: 150, capacity: 70 },
        { id: 5, name: "Evening Lights Terrace", hours: "17:00 - 00:00", location: "Shaykhantahur 6", rating: 4.3, filter: "Evening Lights", price: 110, capacity: 40 },
        { id: 6, name: "Taptchan Place", hours: "10:00 - 22:00", location: "Chilanzar 2", rating: 4.4, filter: "Taptchan / Low Seating", price: 70, capacity: 30 },
      ],
    },
  
    "master-classes": {
      title: "Master Classes",
      filters: [
        "Cooking", "Art & Craft", "Photography", "Dance", "Music",
        "Wine Tasting", "Barista", "Pottery", "Floristics",
      ],
      venues: [
        { id: 1, name: "Chef Studio", hours: "10:00 - 18:00", location: "Amir Temur 12", rating: 4.8, filter: "Cooking", price: 80, capacity: 12 },
        { id: 2, name: "Art Lab", hours: "11:00 - 19:00", location: "Navoi 3", rating: 4.6, filter: "Art & Craft", price: 60, capacity: 15 },
        { id: 3, name: "Dance Academy", hours: "9:00 - 21:00", location: "Yunusabad 8", rating: 4.7, filter: "Dance", price: 50, capacity: 20 },
        { id: 4, name: "Wine Room", hours: "16:00 - 22:00", location: "Mirzo Ulugbek 5", rating: 4.9, filter: "Wine Tasting", price: 120, capacity: 10 },
        { id: 5, name: "Photo Studio Pro", hours: "10:00 - 20:00", location: "Hamza 3", rating: 4.5, filter: "Photography", price: 90, capacity: 8 },
      ],
    },
  
    activities: {
      title: "Activities",
      filters: [
        "Soccer Quest", "Dark Project", "Easy Trip", "Segway",
        "Bowling", "Strike & Leisure", "Board Games", "Live Quest",
      ],
      venues: [
        { id: 1, name: "Quest Zone", hours: "10:00 - 22:00", location: "Chilanzar 5", rating: 4.7, filter: "Live Quest", price: 40, capacity: 6 },
        { id: 2, name: "Bowling Center", hours: "11:00 - 23:00", location: "Yakkasaray 7", rating: 4.4, filter: "Bowling", price: 30, capacity: 20 },
        { id: 3, name: "Board Game Club", hours: "12:00 - 00:00", location: "Navoi 6", rating: 4.6, filter: "Board Games", price: 15, capacity: 8 },
        { id: 4, name: "Segway Park", hours: "9:00 - 20:00", location: "Mirzo Ulugbek 9", rating: 4.5, filter: "Segway", price: 25, capacity: 15 },
        { id: 5, name: "Dark Escape", hours: "14:00 - 22:00", location: "Hamza 1", rating: 4.8, filter: "Dark Project", price: 50, capacity: 4 },
        { id: 6, name: "Soccer Arena", hours: "8:00 - 22:00", location: "Yunusabad 2", rating: 4.3, filter: "Soccer Quest", price: 60, capacity: 22 },
      ],
    },
  
    gifts: {
      title: "Gifts",
      filters: [
        "Chocolate", "Balloons", "Flowers", "Perfume",
        "Experiences", "Jewelry", "Crafts", "Drinks",
      ],
      venues: [
        { id: 1, name: "Sweet Box", hours: "9:00 - 20:00", location: "Amir Temur 2", rating: 4.6, filter: "Chocolate", price: 20, capacity: 1 },
        { id: 2, name: "Balloon Studio", hours: "10:00 - 19:00", location: "Chilanzar 3", rating: 4.5, filter: "Balloons", price: 30, capacity: 1 },
        { id: 3, name: "Flower Lab", hours: "8:00 - 20:00", location: "Navoi 1", rating: 4.8, filter: "Flowers", price: 40, capacity: 1 },
        { id: 4, name: "Scent Studio", hours: "10:00 - 18:00", location: "Yunusabad 4", rating: 4.7, filter: "Perfume", price: 80, capacity: 1 },
        { id: 5, name: "Experience Box", hours: "9:00 - 18:00", location: "Mirzo Ulugbek 2", rating: 4.9, filter: "Experiences", price: 100, capacity: 1 },
      ],
    },
  };
  