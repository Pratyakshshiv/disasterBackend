import { Router } from 'express';
import fetch from 'node-fetch';
import supabase from '../services/supabaseClient.js';
import { getFromCache, saveToCache } from '../services/cache.js';

const router = Router();

// Gemini: Extract location name from text

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // put this in .env

export async function extractLocationWithGemini(description) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Extract only the city or neighborhood names from this disaster description: "${description}". Return as a comma-separated list.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    // Split comma-separated or line-separated locations into an array
    const locations = text
      .split(/[\n,]+/)
      .map(loc => loc.trim())
      .filter(Boolean);

    if (!locations.length) throw new Error('No locations extracted.');
    return locations;
  } catch (err) {
    console.error('❌ Gemini extraction error:', err.message);
    throw new Error(`Gemini API Error: ${err.message}`);
  }
}


//  OpenStreetMap: Get lat/lng from location name
async function geocodeWithOSM(location) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'DisasterCoordinationPlatform/1.0 (your@email)'
    }
  });

  const data = await res.json();

  if (!data || data.length === 0) {
    return { location, lat: null, lon: null };
  }

  return {
    location,
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon)
  };
}

// POST /geocode
router.post('/', async (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });

  const cacheKey = `geocode:${description}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return res.json({ cached: true, ...cached });

  try {
    const locations = await extractLocationWithGemini(description);
    const geocodedResults = [];

    for (const loc of locations) {
      const geo = await geocodeWithOSM(loc);
      geocodedResults.push(geo);
    }

    const result = { extractedLocations: geocodedResults };
    await saveToCache(cacheKey, result);

    res.json({ cached: false, ...result });
  } catch (err) {
    console.error('Geocode Error:', err.message);
    res.status(500).json({ error: 'Geocode failed', details: err.message });
  }
});



export default router;
