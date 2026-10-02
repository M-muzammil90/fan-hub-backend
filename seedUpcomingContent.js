require('dotenv').config();
const mongoose = require('mongoose');
const Content = require('./models/Content');
const Category = require('./models/Category');

const seedUpcoming = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fan-hub-plus');
    console.log('Connected to MongoDB');

    const categories = await Category.find({});
    let animeCat = categories.find(c => c.slug === 'anime' || c.name?.toLowerCase() === 'anime') || categories[0];
    let movieCat = categories.find(c => c.slug === 'movies' || c.name?.toLowerCase() === 'movies') || categories[0];
    let videosCat = categories.find(c => c.slug === 'videos' || c.name?.toLowerCase() === 'videos') || categories[0];

    const upcomingReleases = [
      {
        title: 'Chainsaw Man: Reze Arc Movie',
        slug: 'chainsaw-man-reze-arc-movie',
        description: 'Denji encounters the enigmatic Reze as dangerous Soviet assassins converge on Tokyo in this explosive cinematic chapter.',
        category: animeCat?._id,
        contentType: 'video',
        genre: ['Action', 'Supernatural', 'Dark Fantasy'],
        releaseDate: new Date('2026-10-05T00:00:00.000Z'),
        popularityScore: 98,
        thumbnail: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        isFeatured: true,
        tags: ['Anime', 'Movie', 'Action']
      },
      {
        title: 'Stranger Things: Season 5 Finale',
        slug: 'stranger-things-season-5-finale',
        description: 'The final battle for Hawkins commences as the Upside Down bleeds into the real world in an epic conclusion.',
        category: movieCat?._id,
        contentType: 'video',
        genre: ['Drama', 'Mystery', 'Sci-Fi'],
        releaseDate: new Date('2026-10-12T00:00:00.000Z'),
        popularityScore: 99,
        thumbnail: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=800&auto=format&fit=crop&q=80',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        isFeatured: true,
        tags: ['Sci-Fi', 'Mystery', 'Blockbuster']
      },
      {
        title: 'Solo Leveling: Ragnarok Premiere',
        slug: 'solo-leveling-ragnarok-premiere',
        description: 'The next generation arises as Sung Suho awakens ancestral shadow monarch powers amidst cosmic monarch incursions.',
        category: animeCat?._id,
        contentType: 'video',
        genre: ['Action', 'Fantasy', 'Adventure'],
        releaseDate: new Date('2026-10-19T00:00:00.000Z'),
        popularityScore: 97,
        thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        isFeatured: true,
        tags: ['Anime', 'Action', 'Trending']
      },
      {
        title: 'Spider-Man: Beyond the Spider-Verse',
        slug: 'spider-man-beyond-the-spider-verse',
        description: 'Miles Morales traverses uncharted dimensions to save his father and forge his own destiny against the Spider-Society.',
        category: movieCat?._id,
        contentType: 'video',
        genre: ['Animation', 'Action', 'Multiverse'],
        releaseDate: new Date('2026-11-02T00:00:00.000Z'),
        popularityScore: 100,
        thumbnail: 'https://images.unsplash.com/photo-1635863138275-d9b33299680b?w=800&auto=format&fit=crop&q=80',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        isFeatured: true,
        tags: ['Marvel', 'Movie', 'Animation']
      },
      {
        title: 'Cyberpunk 2077: Phantom Horizon',
        slug: 'cyberpunk-2077-phantom-horizon',
        description: 'A new gripping cinematic saga unfolding within the neon dark underbelly of Night City and the Pacifica Combat Zone.',
        category: videosCat?._id || movieCat?._id,
        contentType: 'video',
        genre: ['Sci-Fi', 'Cyberpunk', 'Thriller'],
        releaseDate: new Date('2026-11-16T00:00:00.000Z'),
        popularityScore: 95,
        thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        isFeatured: false,
        tags: ['Gaming', 'Sci-Fi', 'Cinematic']
      },
      {
        title: 'Demon Slayer: Infinity Castle Chapter 1',
        slug: 'demon-slayer-infinity-castle-chapter-1',
        description: 'The Demon Slayer Corps plunges into Muzan Kibutsuji infinity castle in the first of an epic theatrical trilogy.',
        category: animeCat?._id,
        contentType: 'video',
        genre: ['Action', 'Supernatural', 'Historical'],
        releaseDate: new Date('2026-12-01T00:00:00.000Z'),
        popularityScore: 99,
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
        mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        isFeatured: true,
        tags: ['Anime', 'Blockbuster', 'DemonSlayer']
      }
    ];

    for (const item of upcomingReleases) {
      await Content.findOneAndUpdate(
        { slug: item.slug },
        { ...item },
        { upsert: true, new: true }
      );
      console.log('Seeded upcoming release:', item.title, '->', item.releaseDate.toISOString().split('T')[0]);
    }

    console.log('All upcoming releases seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
};

seedUpcoming();
