const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  try { res.json(await User.find().select('-passwordHash').sort({ username: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try {
    const username = (req.body.username || '').toLowerCase().trim();
    if (!username || !(req.body.password || '').length) return res.status(400).json({ error: 'Meno a heslo sú povinné' });
    if (await User.exists({ username })) return res.status(400).json({ error: 'Používateľ už existuje' });
    const u = await User.create({
      username, name: req.body.name || '', role: req.body.role === 'admin' ? 'admin' : 'user',
      passwordHash: await bcrypt.hash(req.body.password, 10)
    });
    res.status(201).json({ id: u._id, username: u.username, name: u.name, role: u.role });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const upd = {};
    if (req.body.name !== undefined) upd.name = req.body.name;
    if (req.body.role) upd.role = req.body.role === 'admin' ? 'admin' : 'user';
    if (req.body.active !== undefined) upd.active = !!req.body.active;
    if (req.body.password) upd.passwordHash = await bcrypt.hash(req.body.password, 10);
    const u = await User.findByIdAndUpdate(req.params.id, upd, { new: true }).select('-passwordHash');
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json(u);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Nemôžeš zmazať sám seba' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
