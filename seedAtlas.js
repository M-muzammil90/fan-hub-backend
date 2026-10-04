require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Content = require('./models/Content');
const Event = require('./models/Event');

const defaultCategories = [
  { name: 'Anime', slug: 'anime', description: 'Anime series, movies, and specials' },
  { name: 'Movies', slug: 'movies', description: 'Feature films and cinematic releases' },
  { name: 'Games', slug: 'games', description: 'Video games, RPGs, and interactive media' },
  { name: 'Videos', slug: 'videos', description: 'Trailers, fan cuts, and short video clips' }
];

const seedUpcomingContent = [
  {
    title: 'Chainsaw Man: Reze Arc Movie',
    slug: 'chainsaw-man-reze-arc-movie',
    description: 'Denji encounters the enigmatic Reze as dangerous Soviet assassins converge on Tokyo in this explosive cinematic chapter.',
    contentType: 'video',
    genre: ['Action', 'Supernatural', 'Dark Fantasy'],
    releaseDate: new Date('2026-10-05T00:00:00.000Z'),
    popularityScore: 98,
    thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    isFeatured: true,
    tags: ['Anime', 'Movie', 'Action']
  },
  {
    title: 'Stranger Things: Season 5 Finale',
    slug: 'stranger-things-season-5-finale',
    description: 'The final battle for Hawkins commences as the Upside Down bleeds into the real world in an epic conclusion.',
    contentType: 'video',
    genre: ['Drama', 'Mystery', 'Sci-Fi'],
    releaseDate: new Date('2026-10-12T00:00:00.000Z'),
    popularityScore: 99,
    thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    isFeatured: true,
    tags: ['Sci-Fi', 'Netflix', 'Series']
  },
  {
    title: 'GTA VI Official Trailer 2',
    slug: 'gta-vi-official-trailer-2',
    description: 'Rockstar Games reveals unprecedented Vice City gameplay mechanics, heist preparations, and character storylines.',
    contentType: 'video',
    genre: ['Action', 'Open World'],
    releaseDate: new Date('2026-10-20T00:00:00.000Z'),
    popularityScore: 100,
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    isFeatured: true,
    tags: ['Gaming', 'GTA', 'Trailer']
  }
];

const seedSampleEvents = [
  {
    title: 'Demon Slayer Season 4 Fan Convention',
    slug: 'demon-slayer-season-4-fan-convention',
    description: 'Celebrate the Hashira Training Arc with voice actor panels, exclusive previews, merchandise stalls, authentic cosplay competitions, and live OST orchestra performances.',
    eventType: 'Convention',
    city: 'Tokyo',
    venue: 'Makuhari Messe Hall 5',
    address: 'Chiba, Tokyo, Japan',
    startDate: new Date('2026-10-18T13:00:00.000Z'),
    endDate: new Date('2026-10-20T17:00:00.000Z'),
    startTime: '06:00 PM',
    endTime: '10:00 PM',
    location: 'Makuhari Messe Hall 5, Chiba, Tokyo, Japan',
    isVirtual: false,
    organizer: 'Aniplex & FanHub Official',
    ticketPrice: 45,
    maxAttendees: 5000,
    bannerImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    status: 'Upcoming',
    tags: ['Anime', 'Convention', 'Demon Slayer', 'Cosplay']
  },
  {
    title: 'Global Cyberpunk 2077 Lore & Cosplay Summit',
    slug: 'global-cyberpunk-2077-lore-cosplay-summit',
    description: 'An international digital summit bringing together concept artists, game directors, cyber-cosplayers, and lore scholars discussing the future of Night City.',
    eventType: 'Gaming Event',
    city: 'Online',
    venue: 'Twitch / YouTube Live Stream',
    address: 'Virtual Event',
    startDate: new Date('2026-10-25T15:00:00.000Z'),
    endDate: new Date('2026-10-25T21:00:00.000Z'),
    startTime: '08:00 PM',
    endTime: '02:00 AM',
    location: 'Twitch / YouTube Live Stream',
    isVirtual: true,
    organizer: 'CD PROJEKT RED Community Team',
    ticketPrice: 0,
    maxAttendees: 20000,
    bannerImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&auto=format&fit=crop&q=80',
    status: 'Upcoming',
    tags: ['Gaming', 'Cyberpunk', 'Virtual', 'Cosplay']
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in environment');
      process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas successfully!');

    // 1. Seed Categories
    const categoryMap = {};
    for (const catData of defaultCategories) {
      let cat = await Category.findOne({ slug: catData.slug });
      if (!cat) {
        cat = await Category.create(catData);
        console.log(` Created category: ${cat.name}`);
      } else {
        console.log(` Category exists: ${cat.name}`);
      }
      categoryMap[cat.slug] = cat._id;
    }

    // 2. Seed Content
    for (const contentData of seedUpcomingContent) {
      const existing = await Content.findOne({ slug: contentData.slug });
      if (!existing) {
        contentData.category = categoryMap['anime'] || categoryMap['movies'];
        await Content.create(contentData);
        console.log(` Created content: ${contentData.title}`);
      } else {
        console.log(` Content exists: ${contentData.title}`);
      }
    }

    // 3. Seed Events
    for (const eventData of seedSampleEvents) {
      const existing = await Event.findOne({ slug: eventData.slug });
      if (!existing) {
        eventData.category = categoryMap['anime'] || categoryMap['games'];
        await Event.create(eventData);
        console.log(` Created event: ${eventData.title}`);
      } else {
        console.log(` Event exists: ${eventData.title}`);
      }
    }

    console.log('\n🎉 Atlas Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  }
}

seed();
