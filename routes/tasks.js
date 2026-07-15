const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const TaskCatalog = require('../models/TaskCatalog');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const STATUSES = ['todo', 'inprogress', 'blocked', 'review', 'done', 'cancelled'];
const PRIORITIES = ['low', 'normal', 'high', 'critical'];

router.get('/', async (req, res) => {
  try {
    const q = { user: req.user.id };
    if (req.query.status && STATUSES.includes(req.query.status)) q.status = req.query.status;
    if (req.query.priority && PRIORITIES.includes(req.query.priority)) q.priority = req.query.priority;
    if (req.query.tag) q.tags = req.query.tag;
    res.json(await Task.find(q).sort({ order: 1, createdAt: 1 }));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Číselník projektov a zákazníkov použitých v úlohách — ponuka pre nové záznamy
router.get('/catalog', async (req, res) => {
  try {
    const rows = await TaskCatalog.find({ user: req.user.id }).sort({ name: 1 }).lean();
    res.json({
      customers: rows.filter(r => r.type === 'customer').map(r => r.name),
      projects: rows.filter(r => r.type === 'project').map(r => r.name)
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const last = await Task.findOne({ user: req.user.id }).sort({ order: -1 }).select('order').lean();
    const status = STATUSES.includes(req.body.status) ? req.body.status : 'todo';
    const subtasks = normalizeSubtasks(req.body.subtasks) || [];
    const progress = subtasks.length ? subtaskProgress(subtasks) : clampProgress(req.body.progress);
    const tags = normalizeTags(req.body.tags);
    const parent = await resolveParent(req.user.id, req.body.parent, null);
    const dependsOn = await resolveDepends(req.user.id, req.body.dependsOn, null);
    if (status === 'done') {
      const err = await blockedCompletionReason(req.user.id, null, subtasks, dependsOn);
      if (err) return res.status(400).json({ error: err });
    }
    const t = await Task.create({
      user: req.user.id, title: req.body.title,
      description: req.body.description || '',
      project: req.body.project || '', customer: req.body.customer || '',
      note: req.body.note || '',
      progress,
      status, subtasks, tags, parent, dependsOn,
      done: status === 'done', doneAt: status === 'done' ? new Date() : null,
      order: (last?.order || 0) + 1,
      due: req.body.due || null, priority: PRIORITIES.includes(req.body.priority) ? req.body.priority : 'normal'
    });
    await upsertCatalog(req.user.id, 'project', t.project);
    await upsertCatalog(req.user.id, 'customer', t.customer);
    res.status(201).json(t);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Hromadné preusporiadanie (drag & drop) — musí byť pred /:id
router.put('/reorder', async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    for (const it of items) {
      const update = { order: Number(it.order) || 0 };
      if (STATUSES.includes(it.status)) {
        if (it.status === 'done') {
          const t = await Task.findOne({ _id: it.id, user: req.user.id }).lean();
          if (t) {
            const err = await blockedCompletionReason(req.user.id, t._id, t.subtasks || [], t.dependsOn || []);
            if (err) continue; // preskoč nepovolený presun do "Hotové"
          }
        }
        update.status = it.status;
        update.done = it.status === 'done';
        update.doneAt = it.status === 'done' ? new Date() : null;
      }
      await Task.updateOne({ _id: it.id, user: req.user.id }, { $set: update });
    }
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const t = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    ['title', 'description', 'due', 'project', 'customer', 'note'].forEach(k => { if (req.body[k] !== undefined) t[k] = req.body[k]; });
    if (req.body.priority !== undefined && PRIORITIES.includes(req.body.priority)) t.priority = req.body.priority;
    if (req.body.tags !== undefined) t.tags = normalizeTags(req.body.tags);
    if (req.body.subtasks !== undefined) t.subtasks = normalizeSubtasks(req.body.subtasks);
    if (req.body.parent !== undefined) {
      const parent = await resolveParent(req.user.id, req.body.parent, t._id);
      if (req.body.parent && !parent) return res.status(400).json({ error: 'Neplatná nadradená úloha (cyklus alebo neexistuje)' });
      t.parent = parent;
    }
    if (req.body.dependsOn !== undefined) {
      const dependsOn = await resolveDepends(req.user.id, req.body.dependsOn, t._id);
      t.dependsOn = dependsOn;
    }
    // Progres: ak existujú podúlohy, odvoď ho z nich; inak ber zadanú hodnotu
    if (t.subtasks && t.subtasks.length) t.progress = subtaskProgress(t.subtasks);
    else if (req.body.progress !== undefined) t.progress = clampProgress(req.body.progress);
    if (req.body.order !== undefined) t.order = Number(req.body.order) || 0;

    // Status (kanban) má prednosť a synchronizuje done
    let nextStatus = t.status, nextDone = t.done;
    if (req.body.status !== undefined && STATUSES.includes(req.body.status)) {
      nextStatus = req.body.status; nextDone = nextStatus === 'done';
    } else if (req.body.done !== undefined) {
      nextDone = !!req.body.done;
      nextStatus = nextDone ? 'done' : (t.status === 'done' ? 'todo' : t.status);
    }
    if (nextStatus === 'done' && t.status !== 'done') {
      const err = await blockedCompletionReason(req.user.id, t._id, t.subtasks || [], t.dependsOn || []);
      if (err) return res.status(400).json({ error: err });
    }
    t.status = nextStatus; t.done = nextDone;
    t.doneAt = t.done ? (t.doneAt || new Date()) : null;

    await t.save();
    if (req.body.project !== undefined) await upsertCatalog(req.user.id, 'project', t.project);
    if (req.body.customer !== undefined) await upsertCatalog(req.user.id, 'customer', t.customer);
    res.json(t);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Pridá záznam do denníka aktualizácií (nemenný, s autorom a časom)
router.post('/:id/updates', async (req, res) => {
  try {
    const text = String(req.body.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Text aktualizácie je povinný' });
    const t = await Task.findOne({ _id: req.params.id, user: req.user.id });
    if (!t) return res.status(404).json({ error: 'Not found' });
    t.updates.push({ text, authorName: req.user.name || req.user.username || '', createdAt: new Date() });
    await t.save();
    res.status(201).json(t);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await Task.findOneAndDelete({ _id: id, user: req.user.id });
    // odpoj závislosti a hierarchiu na ostatných úlohách používateľa
    await Task.updateMany({ user: req.user.id, parent: id }, { $set: { parent: null } });
    await Task.updateMany({ user: req.user.id, dependsOn: id }, { $pull: { dependsOn: id } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
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

// Očisti tagy z requestu — pole neprázdnych, orezaných reťazcov bez duplicít
function normalizeTags(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => String(x || '').trim()).filter(Boolean))];
}

// Zapíše hodnotu do číselníka projektov/zákazníkov (ak tam ešte nie je, bez ohľadu na veľkosť písmen)
async function upsertCatalog(userId, type, name) {
  const n = String(name || '').trim();
  if (!n) return;
  await TaskCatalog.updateOne(
    { user: userId, type, nameLower: n.toLowerCase() },
    { $setOnInsert: { user: userId, type, name: n, nameLower: n.toLowerCase() } },
    { upsert: true }
  );
}

// Over nadradenú úlohu (existuje, patrí používateľovi, nevytvorí cyklus)
async function resolveParent(userId, parentId, selfId) {
  if (!parentId) return null;
  if (selfId && String(parentId) === String(selfId)) return null;
  const parent = await Task.findOne({ _id: parentId, user: userId }).select('parent').lean();
  if (!parent) return null;
  if (selfId) {
    // prejdi reťazec predkov navrhovaného parenta — self sa v ňom nesmie objaviť
    let cur = parent;
    const seen = new Set();
    while (cur && cur.parent) {
      if (String(cur.parent) === String(selfId) || seen.has(String(cur.parent))) return null;
      seen.add(String(cur.parent));
      cur = await Task.findById(cur.parent).select('parent').lean();
    }
  }
  return parentId;
}

// Over závislosti (existujú, patria používateľovi, netvoria cyklus)
async function resolveDepends(userId, arr, selfId) {
  if (!Array.isArray(arr)) return [];
  const ids = [...new Set(arr.map(String))].filter(id => !selfId || id !== String(selfId));
  if (!ids.length) return [];
  const found = await Task.find({ _id: { $in: ids }, user: userId }).select('dependsOn').lean();
  const valid = [];
  for (const dep of found) {
    if (!selfId) { valid.push(dep._id); continue; }
    // BFS cez závislosti navrhovaného dep — self sa v nich nesmie objaviť
    const queue = [...(dep.dependsOn || [])];
    const seen = new Set();
    let cyclic = false;
    while (queue.length) {
      const cur = String(queue.shift());
      if (cur === String(selfId)) { cyclic = true; break; }
      if (seen.has(cur)) continue;
      seen.add(cur);
      const next = await Task.findById(cur).select('dependsOn').lean();
      if (next) queue.push(...(next.dependsOn || []));
    }
    if (!cyclic) valid.push(dep._id);
  }
  return valid;
}

// Vráti dôvod, prečo úlohu nemožno označiť ako hotovú, alebo null ak je to v poriadku
async function blockedCompletionReason(userId, taskId, subtasks, dependsOn) {
  if ((subtasks || []).some(s => !s.done)) return 'Úloha má nesplnené podúlohy';
  if (taskId) {
    const openChildren = await Task.countDocuments({ user: userId, parent: taskId, status: { $nin: ['done', 'cancelled'] } });
    if (openChildren > 0) return 'Úloha má nedokončené podradené úlohy';
  }
  if ((dependsOn || []).length) {
    const deps = await Task.find({ _id: { $in: dependsOn } }).select('status').lean();
    if (deps.some(d => d.status !== 'done')) return 'Úloha čaká na dokončenie závislostí';
  }
  return null;
}

module.exports = router;
