import { Router } from 'express';
const router = Router();
import supabase from '../services/supabaseClient.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import fetch from 'node-fetch'; // Make sure this is installed


// GET: Get disaster by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('disasters')
      .select('*')
      .eq('id', id)
      .single(); // Get a single row

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Disaster not found' });

    res.json(data);
  } catch (err) {
    console.error('Error fetching disaster by ID:', err.message);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});


// ✅ GET disasters with lat/lon parsed from EWKB

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('disasters_with_coords')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[GET /disasters] Failed:', err);
    res.status(500).json({ error: err.message || err });
  }
});

// ✅ POST: Create disaster with geocoded point
router.post('/', requireAuth, async (req, res) => {
  const { title, location_name, description, tags } = req.body;
  const owner_id = req.user.id;

  // Geocode location
  let coords;
  try {
    coords = await geocodeLocation(location_name);
  } catch (err) {
    console.error('Geocoding failed:', err);
    return res.status(400).json({ error: 'Could not geocode location' });
  }

  const { lat, lon } = coords;
  const wktPoint = `SRID=4326;POINT(${lon} ${lat})`;

  const { data, error } = await supabase
    .from('disasters')
    .insert([{
      title,
      location_name,
      location: wktPoint,
      description,
      tags,
      owner_id,
      audit_trail: [{
        action: 'create',
        user_id: owner_id,
        timestamp: new Date().toISOString()
      }]
    }])
    .select();

  if (error || !data || data.length === 0) {
    return res.status(500).json({ error: error || 'Insert returned no data' });
  }

  req.app.get('io')?.emit('disaster_updated', data[0]);
  res.status(201).json(data[0]);
});

// ✅ PUT: Update disaster
router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { title, location_name, description, tags } = req.body;
  const owner_id = req.user.id;

  // Geocode location
  let coords;
  try {
    coords = await geocodeLocation(location_name);
  } catch (err) {
    console.error('Geocoding failed:', err);
    return res.status(400).json({ error: 'Could not geocode location' });
  }

  const { lat, lon } = coords;
  const wktPoint = `SRID=4326;POINT(${lon} ${lat})`;


  const { data, error } = await supabase
    .from('disasters')
    .update({
      title,
      location_name,
      location: wktPoint,
      description,
      tags,
      audit_trail: [{
        action: 'update',
        user_id: owner_id,
        timestamp: new Date().toISOString()
      }]
    })
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    return res.status(500).json({ error: error || 'Update failed' });
  }

  req.app.get('io')?.emit('disaster_updated', data[0]);
  res.json(data[0]);
});

// ✅ DELETE: Only admin
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('disasters')
    .delete()
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    return res.status(500).json({ error: error || 'Delete failed' });
  }

  req.app.get('io')?.emit('disaster_updated', { deleted: true, id });
  res.json({ message: 'Disaster deleted', id });
});

// ✅ Geocode using Nominatim
async function geocodeLocation(name) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DisasterApp/1.0' }
  });
  const data = await res.json();

  if (!data || data.length === 0) {
    throw new Error('No location found');
  }

  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
  };
}

// ✅ Parse EWKB hex from Supabase geography field
function parseEWKBHex(hex) {
  if (!hex || typeof hex !== 'string' || hex.length < 40) return null;

  try {
    const buf = Buffer.from(hex, 'hex');
    const lon = buf.readDoubleLE(17); // bytes 17–24
    const lat = buf.readDoubleLE(25); // bytes 25–32
    return [lat, lon];
  } catch (err) {
    console.error('[parseEWKBHex] Failed to parse:', hex);
    return null;
  }
}

export default router;
