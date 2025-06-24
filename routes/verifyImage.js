import { Router } from 'express';
import fetch from 'node-fetch';
import { fileTypeFromBuffer } from 'file-type';
import geminiClient from '../services/geminiClient.js';
import { requireAuth } from '../middleware/requireAuth.js';
import supabase from '../services/supabaseClient.js';

const router = Router();

router.post('/report',requireAuth, async (req, res) => {
  const { disaster_id, content, image_url, verification_status } = req.body;
const user_id = req.user.id;
  if (!disaster_id  || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const status = verification_status || 'pending';

  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          disaster_id,
          user_id,
          content,
          image_url,
          verification_status: status,
        },
      ])
      .select();

    if (error) throw error;
req.app.get('io').emit('report_updated', data);
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('❌ Error creating report:', err.message);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

router.get('/list/Report', async (req, res) => {
  const { status } = req.query;

  try {
    let query = supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('verification_status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error('❌ Fetch reports error:', err.message);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /disasters/:id/verify-image
router.post('/verify-image', async (req, res) => {
  const { image_url } = req.body;

  if (!image_url) {
    return res.status(400).json({ error: 'Missing image_url' });
  }

  try {
    // Step 1: Fetch and validate image content
    const response = await fetch(image_url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer); 

    const type = await fileTypeFromBuffer(buffer);
    if (!type || !type.mime.startsWith('image/')) {
      return res.status(400).json({ error: 'URL does not point to a valid image' });
    }

    // Step 2: Send image to Gemini for verification
    const prompt = `Analyze this image for signs of manipulation or verify its disaster context.Answer as "Verified" if the image is real and "Rejected" if you think it's manipulated or AI generated or morphed your answer should be either of these two only`;

    const geminiResponse = await geminiClient.verifyImage(buffer, prompt);

    if (!geminiResponse || !geminiResponse.result) {
      return res.status(500).json({ error: 'Image verification failed' });
    }

    // Step 3: Return analysis to client
    res.json({
      analysis: geminiResponse.result,
    });
  } catch (err) {
    console.error('❌ Image verification error:', err);
    res.status(500).json({ error: 'Image verification failed' });
  }
});

export default router;
