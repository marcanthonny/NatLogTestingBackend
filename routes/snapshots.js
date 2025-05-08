const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Get all snapshots
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single snapshot - simplified
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('snapshots')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create snapshot
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('snapshots')
      .insert(req.body);
      
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete snapshot
router.delete('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('snapshots')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    res.json({ message: 'Snapshot deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
