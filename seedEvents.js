require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');
const Category = require('./models/Category');

const seedEvents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fanhub');
    console.log('Connected to MongoDB');

    // Find or create categories
    const categories = await Category.find({});
    console.log('Available categories in DB:', categories.map(c => ({ id: c._id, name: c.name, slug: c.slug })));

    let animeCat = categories.find(c => c.slug === 'anime' || c.name?.toLowerCase() === 'anime') || categories[0];
    let movieCat = categories.find(c => c.slug === 'movies' || c.name?.toLowerCase() === 'movies') || categories[0];
    let gamesCat = categories.find(c => c.slug === 'games' || c.slug === 'gaming' || c.name?.toLowerCase() === 'games' || c.name?.toLowerCase() === 'gaming') || categories[0];
    let videoCat = categories.find(c => c.slug === 'videos' || c.name?.toLowerCase() === 'videos') || categories[0];

    const sampleEvents = [
      {
        title: 'Demon Slayer Season 4 Fan Convention',
        slug: 'demon-slayer-season-4-fan-convention',
        description: 'Celebrate the Hashira Training Arc with voice actor panels, exclusive previews, merchandise stalls, authentic cosplay competitions, and live OST orchestra performances.',
        category: animeCat?._id,
        eventType: 'Convention',
        startDate: new Date('2026-10-18T13:00:00.000Z'),
        endDate: new Date('2026-10-20T17:00:00.000Z'),
        startTime: '06:00 PM',
        endTime: '10:00 PM',
        venue: 'Karachi Expo Center',
        address: 'University Road, Gulshan-e-Iqbal, Karachi',
        city: 'Karachi',
        latitude: 24.8988,
        longitude: 67.0782,
        organizer: 'FanHub Pakistan',
        ticketUrl: 'https://ticketbox.pk/event/demon-slayer-2026',
        ticketPrice: 1500,
        totalTickets: 250,
        availableTickets: 185,
        ticketTiers: [
          { name: 'Standard Pass', price: 1500, description: 'Full 1-day convention access and stage seating', totalTickets: 150, availableTickets: 110 },
          { name: 'VIP Pass', price: 3500, description: 'Front-row stage access, exclusive merch goodie bag, and fast-track entry', totalTickets: 75, availableTickets: 55 },
          { name: 'Student Pass', price: 1000, description: 'Discounted admission with valid student ID card', totalTickets: 25, availableTickets: 20 }
        ],
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
        status: 'Upcoming',
        isFeatured: true,
        isPublished: true
      },
      {
        title: 'Anime Expo 2026 Pakistan',
        slug: 'anime-expo-2026-pakistan',
        description: 'The largest anime and manga summit in South Asia. Featuring Japanese guest artists, manga drawing workshops, maid cafes, gaming tournaments, and international cosplay championships.',
        category: animeCat?._id,
        eventType: 'Convention',
        startDate: new Date('2026-10-26T09:00:00.000Z'),
        endDate: new Date('2026-10-28T18:00:00.000Z'),
        startTime: '10:00 AM',
        endTime: '08:00 PM',
        venue: 'Karachi Expo Center',
        address: 'Main University Road, Karachi',
        city: 'Karachi',
        latitude: 24.8988,
        longitude: 67.0782,
        organizer: 'Otaku Guild Pakistan',
        ticketUrl: 'https://animeexpo.pk/passes',
        ticketPrice: 2000,
        totalTickets: 500,
        availableTickets: 340,
        ticketTiers: [
          { name: 'Standard Pass', price: 2000, description: 'All-day summit access and manga workshops', totalTickets: 300, availableTickets: 200 },
          { name: 'VIP Pass', price: 4500, description: 'VIP lounge, meet & greet photo passes, and collector badge', totalTickets: 150, availableTickets: 105 },
          { name: 'Cosplayer Pass', price: 1200, description: 'Discounted rate for registered cosplay competition entrants', totalTickets: 50, availableTickets: 35 }
        ],
        image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
        status: 'Upcoming',
        isFeatured: true,
        isPublished: true
      },
      {
        title: 'Jujutsu Kaisen Cursed Energy Fan Gathering',
        slug: 'jujutsu-kaisen-cursed-energy-fan-gathering',
        description: 'Special screening of the Shibuya Incident climax, domain expansion VR experience, cosplay photography booths, trivia challenges, and exclusive official Jujutsu Kaisen collectibles.',
        category: animeCat?._id,
        eventType: 'Meetup',
        startDate: new Date('2026-11-02T11:00:00.000Z'),
        endDate: new Date('2026-11-02T19:00:00.000Z'),
        startTime: '04:00 PM',
        endTime: '09:00 PM',
        venue: 'Alhamra Arts Council',
        address: '68 The Mall, Garhi Shahu, Lahore',
        city: 'Lahore',
        latitude: 31.5546,
        longitude: 74.3317,
        organizer: 'Lahore Anime Community',
        ticketUrl: 'https://alhamra.org.pk/events/jjk-meetup',
        ticketPrice: 1200,
        totalTickets: 150,
        availableTickets: 98,
        ticketTiers: [
          { name: 'General Pass', price: 1200, description: 'Entry to screening and VR booth activities', totalTickets: 100, availableTickets: 65 },
          { name: 'VIP Pass', price: 2800, description: 'Priority screening seats and exclusive Gojo/Sukuna art poster', totalTickets: 50, availableTickets: 33 }
        ],
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
        status: 'Upcoming',
        isFeatured: true,
        isPublished: true
      },
      {
        title: 'One Piece Live Action Season 2 Screening Gala',
        slug: 'one-piece-live-action-season-2-screening-gala',
        description: 'Exclusive grand IMAX premiere of One Piece Season 2 with cast Q&A broadcast, pirate ship photo zones, bounty hunter challenges, and free commemorative treasure coins for all attendees.',
        category: movieCat?._id || animeCat?._id,
        eventType: 'Screening',
        startDate: new Date('2026-11-12T13:00:00.000Z'),
        endDate: new Date('2026-11-12T17:00:00.000Z'),
        startTime: '07:00 PM',
        endTime: '11:00 PM',
        venue: 'Centaurus Cineplex',
        address: 'Jinnah Avenue, Sector F-8, Islamabad',
        city: 'Islamabad',
        latitude: 33.7077,
        longitude: 73.0501,
        organizer: 'Grand Line Pakistan',
        ticketUrl: 'https://centaurus.com.pk/cinema',
        ticketPrice: 1800,
        totalTickets: 200,
        availableTickets: 145,
        ticketTiers: [
          { name: 'IMAX Standard', price: 1800, description: 'IMAX screening ticket with complimentary popcorn combo', totalTickets: 150, availableTickets: 110 },
          { name: 'Captain VIP', price: 3200, description: 'Recliner VIP seat and authentic Straw Hat crew metal coin', totalTickets: 50, availableTickets: 35 }
        ],
        image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80',
        status: 'Upcoming',
        isFeatured: false,
        isPublished: true
      },
      {
        title: 'Pakistan Esports Championship & Gaming Fest',
        slug: 'pakistan-esports-championship-and-gaming-fest',
        description: 'Tekken 8, Valorant, Street Fighter 6, and FC 25 national championship arena. Free-to-play VR arcade zones, custom gaming PC exhibits, and indie developer showcases.',
        category: gamesCat?._id || animeCat?._id,
        eventType: 'Gaming Event',
        startDate: new Date('2026-11-20T05:00:00.000Z'),
        endDate: new Date('2026-11-22T17:00:00.000Z'),
        startTime: '11:00 AM',
        endTime: '10:00 PM',
        venue: 'PAF Museum Convention Hall',
        address: 'Shahrah-e-Faisal, Karsaz, Karachi',
        city: 'Karachi',
        latitude: 24.8778,
        longitude: 67.0945,
        organizer: 'CyberSports PK',
        ticketUrl: 'https://esports.pk/championship-2026',
        ticketPrice: 1600,
        totalTickets: 300,
        availableTickets: 215,
        ticketTiers: [
          { name: 'Gamer Pass', price: 1600, description: 'Tournament spectator and Freeplay VR arcade access', totalTickets: 200, availableTickets: 145 },
          { name: 'VIP Player Pass', price: 3000, description: 'Tournament bracket entry and dedicated high-refresh PC station', totalTickets: 100, availableTickets: 70 }
        ],
        image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&auto=format&fit=crop&q=80',
        status: 'Upcoming',
        isFeatured: true,
        isPublished: true
      },
      {
        title: 'Cyberpunk & Cosplay Masquerade Gala',
        slug: 'cyberpunk-cosplay-masquerade-gala',
        description: 'A neon-lit celebration of sci-fi, cosplay craftmanship, and cinematic props. Includes runway stage competition with cash prizes, synthwave DJ sets, and pro prop-making seminars.',
        category: animeCat?._id,
        eventType: 'Cosplay Event',
        startDate: new Date('2026-12-05T12:00:00.000Z'),
        endDate: new Date('2026-12-05T20:00:00.000Z'),
        startTime: '05:00 PM',
        endTime: '11:00 PM',
        venue: 'Rawalpindi Arts Council',
        address: 'Stadium Road, Shamsabad, Rawalpindi',
        city: 'Rawalpindi',
        latitude: 33.6425,
        longitude: 73.0768,
        organizer: 'Cosplay Guild PK',
        ticketUrl: 'https://cosplaygala.pk',
        ticketPrice: 1400,
        totalTickets: 180,
        availableTickets: 120,
        ticketTiers: [
          { name: 'Gala Pass', price: 1400, description: 'Masquerade entry and synthwave concert', totalTickets: 120, availableTickets: 80 },
          { name: 'VIP Cosplayer Pass', price: 2600, description: 'Dedicated dressing room, pro photo shoot, and VIP stage pass', totalTickets: 60, availableTickets: 40 }
        ],
        image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
        status: 'Upcoming',
        isFeatured: false,
        isPublished: true
      }
    ];

    for (const evt of sampleEvents) {
      await Event.findOneAndUpdate(
        { slug: evt.slug },
        { ...evt },
        { upsert: true, new: true }
      );
      console.log('Seeded event:', evt.title);
    }

    // Ensure all existing events in DB have isPublished: true
    await Event.updateMany({}, { $set: { isPublished: true, status: 'Upcoming' } });

    console.log('All events seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedEvents();
