const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  try { res.json(await Task.find({ user: req.user.id }).sort({ order: 1, createdAt: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const last = await Task.findOne({ user: req.user.id }).sort({ order: -1 }).select('order').lean();
    const status = ['todo', 'inprogress', 'done'].includes(req.body.status) ? req.body.status : 'todo';
    const subtasks = normalizeSubtasks(req.body.subtasks) || [];
    const progress = subtasks.length ? subtaskProgress(subtasks) : clampProgress(req.body.progress);
    const t = await Task.create({
      user: req.user.id, title: req.body.title,
      description: req.body.description || '',
      project: req.body.project || '', customer: req.body.customer || '',
      note: req.body.note || '',
      progress,
      status, subtasks,
      done: status === 'done', doneAt: status === 'done' ? new Date() : null,
      order: (last?.order || 0) + 1,
      due: req.body.due || null, priority: req.body.priority || 'normal'
    });
    res.status(201).json(t);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Hromadné preusporiadanie (drag & drop) — musí byť pred /:id
router.put('/reorder', async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    await Promise.all(items.map(it => {
      const update = { order: Number(it.order) || 0 };
      if (['todo', 'inprogress', 'done'].includes(it.status)) {
        update.status = it.status;
        update.done = it.status === 'done';
        update.doneAt = it.status === 'done' ? new Date() : null;
      }
      return Task.updateOne({ _id: it.id, user: req.user.id }, { $set: update });
    }));
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const t = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    ['title', 'description', 'due', 'priority', 'project', 'customer', 'note'].forEach(k => { if (req.body[k] !== undefined) t[k] = req.body[k]; });
    if (req.body.subtasks !== undefined) t.subtasks = normalizeSubtasks(req.body.subtasks);
    // Progres: ak existujú podúlohy, odvoď ho z nich; inak ber zadanú hodnotu
    if (t.subtasks && t.subtasks.length) t.progress = subtaskProgress(t.subtasks);
    else if (req.body.progress !== undefined) t.progress = clampProgress(req.body.progress);
    if (req.body.order !== undefined) t.order = Number(req.body.order) || 0;

    // Status (kanban) má prednosť a synchronizuje done
    if (req.body.status !== undefined && ['todo', 'inprogress', 'done'].includes(req.body.status)) {
      t.status = req.body.status;
      t.done = t.status === 'done';
      t.doneAt = t.done ? (t.doneAt || new Date()) : null;
    } else if (req.body.done !== undefined) {
      t.done = !!req.body.done;
      t.status = t.done ? 'done' : (t.status === 'done' ? 'todo' : t.status);
      t.doneAt = t.done ? new Date() : null;
    }
    await t.save();
    res.json(t);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try { await Task.findOneAndDelete({ _id: req.params.id, user: req.user.id }); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

function clampProgress(v) {
  const n = Math.round(Number(v));
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// Očisti podúlohy z requestu na { title, done }
function normalizeSubtasks(arr) {
  if (!Array.isArray(arr)) return undefined;
  return arr
    .map(s => ({ title: String(s.title || '').trim(), done: !!s.done }))
    .filter(s => s.title.length);
}

// Progres odvodený z pomeru hotových podúloh
function subtaskProgress(subs) {
  if (!subs.length) return 0;
  return Math.round(subs.filter(s => s.done).length / subs.length * 100);
}

module.exports = router;
