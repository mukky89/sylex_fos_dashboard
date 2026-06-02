const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const Interrogator = require('../models/Interrogator');
const CalendarEvent = require('../models/CalendarEvent');
const { requireAuth } = require('../middleware/auth');

router.get('/summary', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const tasks = await Task.find().populate('user', 'name username').lean();
    const projects = await Project.find().lean();
    const interr = await Interrogator.find().lean();

    // ── Dovolenky (aktuálne + najbližších 30 dní) ───────────────────────────
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const window30   = new Date(todayStart.getTime() + 30 * 864e5);
    const vacRaw = await CalendarEvent.find({
      type: 'dovolenka',
      $or: [
        // Začína dnes alebo v ďalších 30 dňoch
        { date: { $gte: todayStart, $lte: window30 } },
        // Prebieha (začala skôr, ešte neskončila)
        { date: { $lte: todayStart }, endDate: { $gte: todayStart } }
      ]
    }).sort({ date: 1 }).lean();

    const vacations = vacRaw.map(v => ({
      person:   v.person || v.title || '—',
      title:    v.title,
      date:     v.date,
      endDate:  v.endDate || null,
      isActive: new Date(v.date) <= now && (!v.endDate || new Date(v.endDate) >= todayStart),
      note:     v.note || ''
    }));

    // Úlohy — celkové + po používateľoch
    const taskTotals = { open: 0, done: 0, overdue: 0 };
    const byUser = {};
    tasks.forEach(t => {
      const uid = t.user?._id?.toString() || 'unknown';
      const uname = t.user?.name || t.user?.username || 'neznámy';
      byUser[uid] = byUser[uid] || { name: uname, open: 0, overdue: 0, done: 0, projects: [] };
      if (t.done) { taskTotals.done++; byUser[uid].done++; }
      else {
        taskTotals.open++; byUser[uid].open++;
        if (t.due && new Date(t.due) < new Date(now.toDateString())) { taskTotals.overdue++; byUser[uid].overdue++; }
      }
    });
    // Projekty — podľa fázy + priradenie k vlastníkovi (owner = text)
    const phases = { koncept: 0, prototyp: 0, testovanie: 0, vyroba: 0, ukoncene: 0 };
    const ownerProjects = {};
    projects.forEach(p => { phases[p.phase] = (phases[p.phase] || 0) + 1; if (p.owner) (ownerProjects[p.owner] = ownerProjects[p.owner] || []).push({ title: p.title, phase: p.phase }); });

    // Interrogátory — podľa stavu
    const igStatus = { sklad: 0, predany: 0, zakaznik: 0, oprava: 0, vyradeny: 0 };
    interr.forEach(i => { igStatus[i.status] = (igStatus[i.status] || 0) + 1; });

    res.json({
      taskTotals,
      users: Object.values(byUser).sort((a, b) => b.open - a.open),
      ownerProjects,
      phases,
      projectsTotal: projects.length,
      igStatus,
      igTotal: interr.length,
      vacations
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
