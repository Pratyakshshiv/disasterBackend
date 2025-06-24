import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { getFromCache, saveToCache } from '../services/cache.js';

const router = Router();
const parser = new Parser();

// // 📡 Scrape NDMA India
// async function scrapeNDMA() {
//   const url = 'https://ndma.gov.in/';
//   const response = await axios.get(url);
//   const $ = cheerio.load(response.data);
//   const updates = [];

//   $('a').each((_, el) => {
//     const title = $(el).text().trim();
//     const href = $(el).attr('href');
//     if (
//       title.length > 10 &&
//       href &&
//       (title.toLowerCase().includes('alert') ||
//         title.toLowerCase().includes('cyclone') ||
//         title.toLowerCase().includes('earthquake'))
//     ) {
//       updates.push({
//         source: 'NDMA India',
//         title,
//         link: href.startsWith('http') ? href : `https://ndma.gov.in${href}`,
//       });
//     }
//   });

//   return updates.length > 0
//     ? updates
//     : [{ source: 'NDMA India', title: 'No recent alerts', link: url }];
// }

// 📡 Scrape NDMA India
async function scrapeNDMA() {
  const url = 'https://ndma.gov.in/';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const updates = [];

  $('a').each((_, el) => {
    if (updates.length >= 5) return false; // ✅ Limit to 5 results

    const title = $(el).text().trim();
    const href = $(el).attr('href');

    if (
      title.length > 10 &&
      href &&
      (title.toLowerCase().includes('alert') ||
        title.toLowerCase().includes('cyclone') ||
        title.toLowerCase().includes('earthquake'))
    ) {
      updates.push({
        source: 'NDMA India',
        title,
        link: href.startsWith('http') ? href : `https://ndma.gov.in${href}`,
      });
    }
  });

  return updates.length > 0
    ? updates
    : [{ source: 'NDMA India', title: 'No recent alerts', link: url }];
}



// 📥 Route: /disasters/:id/official-updates
router.get('/:id/official-updates', async (req, res) => {
  const { id } = req.params;
  const cacheKey = `official:${id}`;

  try {
    const cached = await getFromCache(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit for official updates of disaster ${id}`);
      return res.json({ cached: true, updates: cached.updates });
    }

    const [ndmaUpdates] = await Promise.all([
      scrapeNDMA()
    ]);

    const combined = [...ndmaUpdates];

    await saveToCache(cacheKey, { updates: combined });

    console.log(`🌍 Official updates fetched from NDMA for ${id}`);
    res.json({ cached: false, updates: combined });
  } catch (err) {
    console.error('❌ Error fetching official updates:', err.message);
    res.status(500).json({ error: 'Failed to fetch official updates' });
  }
});

export default router;
