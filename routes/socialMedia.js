import { Router } from 'express';
import { getFromCache, saveToCache } from '../services/cache.js';
import supabase from '../services/supabaseClient.js';

const router = Router();

// Mock social media posts generator
function generateMockPosts(disasterId) {
  const samplePosts = [
    {
      user: 'citizen1',
      post: '#floodrelief Need food in Brooklyn',
      timestamp: new Date().toISOString()
    },
    {
      user: 'localnews',
      post: 'Emergency shelter set up in East Brooklyn #flood',
      timestamp: new Date().toISOString()
    },
    {
      user: 'volunteerX',
      post: 'Offering blankets near Williamsburg #disasterHelp',
      timestamp: new Date().toISOString()
    }
  ];

  return samplePosts.map(p => ({ ...p, disaster_id: disasterId }));
}

// GET /disasters/:id/social-media
router.get('/:id/social-media', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `social:${id}`;

  try {
    // Step 1: Check Supabase cache
    // Step 1: Check Supabase cache
const cached = await getFromCache(cacheKey);
const iot = req.app.get('io');

if (cached) {
  console.log(`📦 Cache hit for disaster ${id}`);
  // Emit even from cache
  iot.emit('social_media_updated', { disaster_id: id, posts: cached.posts });
  return res.json({ cached: true, posts: cached.posts });
}

    // Step 2: Generate mock posts
    const posts = generateMockPosts(id);

    // Step 3: Cache response in Supabase
    await saveToCache(cacheKey, { posts });

    // Step 4: Emit WebSocket event
    const io = req.app.get('io');
    io.emit('social_media_updated', { disaster_id: id, posts });

    // Step 5: Log action
    console.log(`📡 Fetched and cached social media for disaster ${id}`);

    res.json({ cached: false, posts });
  } catch (err) {
    console.error('❌ Social media fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch social media' });
  }
});

export default router;
