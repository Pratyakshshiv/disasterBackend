import { Router } from 'express';
import supabase from '../services/supabaseClient.js';

const router = Router();

// 📍 Get nearby resources for a disaster
router.get('/:id/resources', async (req, res) => {
  const { id } = req.params;
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon query params are required' });
  }

  try {
    const point = `POINT(${lon} ${lat})`;

    const { data, error } = await supabase.rpc('get_nearby_resources', {
      center_point: point,
      radius_meters: 10000,
      disaster_id_input: id,
    });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('❌ Resource query error:', err.message);
    res.status(500).json({ error: 'Failed to fetch nearby resources' });
  }
});


// GET /resources/all — Get all resources with lat/lon
router.get('/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('id, title, type, location_name, description, created_at, coordinates');

    if (error) throw error;

    const resources = data.map(r => {
      const [lon, lat] = r.coordinates?.coordinates || [null, null];
      return { ...r, lat, lon };
    });

    res.json(resources);
  } catch (err) {
    console.error("❌ Failed to fetch all resources:", err.message);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});



// ➕ POST /resources — Create a new resource
router.post('/', async (req, res) => {
  const { disaster_id, title, description, type, location_name, latitude, longitude } = req.body;

  if (!disaster_id || !title || !type || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('resources')
      .insert([
        {
          disaster_id,
          title,
          description,
          type,
          location_name,
          coordinates: `SRID=4326;POINT(${longitude} ${latitude})`,
        },
      ])
      .select();
    if (error || !data || data.length === 0) throw error || new Error('Insert failed');

    const io = req.app.get('io');
    io.emit('resource_updated', data[0]);

    res.status(201).json(data[0]);
  } catch (err) {
    console.error('❌ Resource insert error:', err.message);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// 🗑️ DELETE /resources/:id — Optional
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from('resources')
      .delete()
      .eq('id', id)
      .select();

    if (error) throw error;

    const io = req.app.get('io');
    io.emit('resource_updated', { deleted: true, id });

    res.json({ message: 'Resource deleted', id });
  } catch (err) {
    console.error('❌ Resource delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;
