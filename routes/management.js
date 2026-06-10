const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const Interrogator = require('../models/Interrogator');
const CalendarEvent = require('../models/CalendarEvent');
const Sale = require('../models/Sale');
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

// ════════════════════════ PREDAJ / TRŽBY / ZISKOVOSŤ ════════════════════════
router.get('/sales', requireAuth, async (req, res) => {
  try {
    const months = Math.max(1, Math.min(36, Number(req.query.months) || 12));
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const sales = await Sale.find({ date: { $gte: from } }).lean();

    const rev = s => (s.qty || 0) * (s.unitPrice || 0);
    const cost = s => (s.qty || 0) * (s.unitCost || 0);

    // Súhrn
    let revenue = 0, cogs = 0;
    sales.forEach(s => { revenue += rev(s); cogs += cost(s); });
    const profit = revenue - cogs;
    const margin = revenue ? Math.round(profit / revenue * 100) : 0;
    const orders = sales.length;
    const avgOrder = orders ? Math.round(revenue / orders) : 0;

    // Mesačný trend (vyplní aj prázdne mesiace)
    const monthly = [];
    const mIndex = {};
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const row = { ym, label: String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getFullYear()).slice(2), revenue: 0, cost: 0, profit: 0, orders: 0 };
      mIndex[ym] = row; monthly.push(row);
    }
    sales.forEach(s => {
      const d = new Date(s.date);
      const ym = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      const row = mIndex[ym]; if (!row) return;
      row.revenue += rev(s); row.cost += cost(s); row.profit += rev(s) - cost(s); row.orders++;
    });
    monthly.forEach(r => { r.revenue = Math.round(r.revenue); r.cost = Math.round(r.cost); r.profit = Math.round(r.profit); });

    // Rast mesiac-na-mesiac
    const cur = monthly[monthly.length - 1]?.revenue || 0;
    const prev = monthly[monthly.length - 2]?.revenue || 0;
    const growth = prev ? Math.round((cur - prev) / prev * 100) : (cur ? 100 : 0);

    // Agregácia pomocná
    const agg = (keyFn) => {
      const m = {};
      sales.forEach(s => {
        const k = keyFn(s) || '—';
        m[k] = m[k] || { name: k, revenue: 0, cost: 0, profit: 0, qty: 0, orders: 0 };
        m[k].revenue += rev(s); m[k].cost += cost(s); m[k].profit += rev(s) - cost(s); m[k].qty += (s.qty || 0); m[k].orders++;
      });
      return Object.values(m).map(x => ({
        ...x, revenue: Math.round(x.revenue), cost: Math.round(x.cost), profit: Math.round(x.profit),
        margin: x.revenue ? Math.round(x.profit / x.revenue * 100) : 0
      }));
    };

    const byCustomer = agg(s => s.customer).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
    const byProduct = agg(s => s.product).sort((a, b) => b.profit - a.profit);
    const byCategory = agg(s => s.category).sort((a, b) => b.revenue - a.revenue);

    res.json({
      months, revenue: Math.round(revenue), cost: Math.round(cogs), profit: Math.round(profit),
      margin, orders, avgOrder, growth,
      monthly, byCustomer, byProduct, byCategory
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
