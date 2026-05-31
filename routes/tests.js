const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const TestProtocol = require('../models/TestProtocol');

const RESULT_LABEL = { pass: 'VYHOVEL', fail: 'NEVYHOVEL', na: 'N/A' };
const fmtDateSk = (d) => d ? new Date(d).toLocaleDateString('sk-SK', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

// Excel export jedného protokolu
router.get('/:id/export.xlsx', async (req, res) => {
  try {
    const t = await TestProtocol.findById(req.params.id).lean();
    if (!t) return res.status(404).json({ error: 'Not found' });
    const wb = new ExcelJS.Workbook(); wb.creator = 'FOS Dashboard';
    const ws = wb.addWorksheet('Protokol');
    ws.addRow(['Testovací protokol']).font = { bold: true, size: 14 };
    ws.addRow([]);
    [['Názov', t.title], ['Projekt', t.project], ['Výrobok', t.product], ['Dátum', fmtDateSk(t.date)],
     ['Tester', t.tester], ['Typ testu', t.ptype], ['Výsledok', RESULT_LABEL[t.result] || t.result]]
      .forEach(([k, v]) => { const r = ws.addRow([k, v || '']); r.getCell(1).font = { bold: true }; });
    ws.addRow([]);
    const head = ws.addRow(['Meranie', 'Hodnota', 'Jednotka', 'Min', 'Max', 'Vyhovel']);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0891B2' } }; });
    (t.measurements || []).forEach(m => ws.addRow([m.name, m.value, m.unit, m.min, m.max, m.pass ? 'áno' : 'nie']));
    if (t.note) { ws.addRow([]); const n = ws.addRow(['Poznámka', t.note]); n.getCell(1).font = { bold: true }; }
    ws.columns.forEach(c => { c.width = 18; });
    ws.getColumn(1).width = 26;
    const buffer = await wb.xlsx.writeBuffer();
    const safe = (t.title || 'protokol').replace(/[^a-zA-Z0-9áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ _-]/g, '').trim().replace(/\s+/g, '_') || 'protokol';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Protokol_${safe}.xlsx"`);
    res.send(Buffer.from(buffer));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', async (req, res) => {
  try { res.json(await TestProtocol.find().sort({ date: -1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.get('/:id', async (req, res) => {
  try { const d = await TestProtocol.findById(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await TestProtocol.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try { const d = await TestProtocol.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!d) return res.status(404).json({ error: 'Not found' }); res.json(d); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { const d = await TestProtocol.findByIdAndDelete(req.params.id); if (!d) return res.status(404).json({ error: 'Not found' }); res.json({ message: 'Deleted' }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
