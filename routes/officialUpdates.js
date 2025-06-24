import { Router } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { getFromCache, saveToCache } from '../services/cache.js';

const router = Router();
const parser = new Parser();

// 📡 Scrape NDMA India
async function scrapeNDMA() {
  const url = 'https://ndma.gov.in/';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const updates = [];

  $('a').each((_, el) => {
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

// 🌐 Scrape ReliefWeb
async function scrapeReliefWeb() {
  const url = 'https://reliefweb.int/updates';
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  const $ = cheerio.load(response.data);
  const updates = [];

  $('div.rw-content-list > article').each((_, el) => {
    const anchor = $(el).find('h3 a');
    const title = anchor.text().trim();
    const href = anchor.attr('href');

    if (title && href) {
      updates.push({
        source: 'ReliefWeb',
        title,
        link: href.startsWith('http') ? href : `https://reliefweb.int${href}`,
      });
    }
  });

  return updates.slice(0, 5);
}

// 🇺🇸 Scrape FEMA RSS
async function scrapeFEMA() {
  try {
    const feed = await parser.parseURL('https://www.fema.gov/press-release/rss.xml');
    return feed.items.slice(0, 5).map(item => ({
      source: 'FEMA',
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      summary: item.contentSnippet,
    }));
  } catch (err) {
    console.error('❌ Failed to scrape FEMA:', err.message);
    return [{
      source: 'FEMA',
      title: 'Failed to fetch FEMA updates',
      link: '',
      error: err.message
    }];
  }
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

    const [ndmaUpdates, rwUpdates, femaUpdates] = await Promise.all([
      scrapeNDMA(),
      scrapeReliefWeb(),
      scrapeFEMA(),
    ]);

    const combined = [...ndmaUpdates, ...rwUpdates, ...femaUpdates];

    await saveToCache(cacheKey, { updates: combined });

    console.log(`🌍 Official updates fetched from NDMA, ReliefWeb, and FEMA for ${id}`);
    res.json({ cached: false, updates: combined });
  } catch (err) {
    console.error('❌ Error fetching official updates:', err.message);
    res.status(500).json({ error: 'Failed to fetch official updates' });
  }
});

export default router;
