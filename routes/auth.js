import { Router } from 'express';
import supabase from '../utils/supabaseClient.js';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

router.post('/login', async (req, res) => {
  const { username, password } = req.body;


  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();
  if (error || !data) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: data.id, username: data.username, role: data.role },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
const role=data.role;
  res.json({ token,role });
});

router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;

  const validRoles = ['admin', 'responder', 'citizen'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role selected.' });
  }

  // Check if username exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username);

  if (existing.length > 0) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const { data, error } = await supabase
    .from('users')
    .insert([{  username, password, role }])
    .select();

  if (error) return res.status(500).json({ error: error.message });

  const user = data[0];
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  res.json({ token, username: user.username }); // auto-login response
});


export default router;
