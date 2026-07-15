const express = require('express');
const http = require('http');
const router = express.Router();
const ThermalBath = require('../models/ThermalBath');

// ─────────────────────────────────────────────────────────────────────────────
// Komunikácia so zariadením SIKA TP Premium cez REST-API (ethernet).
// Základná štruktúra požiadavky:  http://<IP>:<PORT>/ajax/<COMMAND>
// Port je štandardne 8081. Na zariadení musí byť aktivované „Remote Control".
// (Zdroj: REST-API / TP Software Documentation, 31/08/2023.)
// ─────────────────────────────────────────────────────────────────────────────

// Nízkoúrovňové HTTP volanie jedného príkazu. Vráti { ok, data } alebo { ok:false, error }.
function tpRequest(ip, port, command, timeoutMs = 4000) {
  return new Promise(resolve => {
    if (!ip) return resolve({ ok: false, error: 'Chýba IP adresa zariadenia' });
    const req = http.get({ host: ip, port: port || 8081, path: '/ajax/' + command, timeout: timeoutMs }, resp => {
      let raw = '';
      resp.on('data', c => { raw += c; });
      resp.on('end', () => {
        try { resolve({ ok: true, data: JSON.parse(raw) }); }
        catch { resolve({ ok: false, error: 'Neplatná odpoveď zariadenia', raw: String(raw).slice(0, 200) }); }
      });
    });
    req.on('error', e => resolve({ ok: false, error: e.code === 'EHOSTUNREACH' || e.code === 'ECONNREFUSED' || e.code === 'ETIMEDOUT' ? 'Zariadenie nedostupné' : e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Časový limit vypršal (zariadenie neodpovedá)' }); });
  });
}

// ── Dekódovanie chybových masiek (getTR: transient_error_mask / fatal_error_mask) ──
// Kódy z dokumentácie. Horný bit (0x80000000 fatal / 0x40000000 transient) je len
// kategória; jednotlivé chyby sú nižšie bity. Dekódujeme, ktoré bity sú nastavené.
const FATAL_ERRORS = {
  0x00000001: ['err_f_Vcc_12V', 'Chyba napájania 12 V dosky'],
  0x00000002: ['err_f_Vcc_IN', 'Chyba napájania Peltierových článkov'],
  0x00000004: ['err_f_ADC_extern', 'Chyba čítania externého ADC'],
  0x00000008: ['err_f_ADC_intern', 'Chyba čítania interného ADC (alebo nekompatibilný firmvér)'],
  0x00000010: ['err_f_i_sensor', 'Interný teplotný senzor sa nedá zmerať'],
  0x00000020: ['err_f_ADCX_reference', 'Referencia externého ADC je chybná'],
  0x00000040: ['err_f_overtemp_switch', 'Zopla teplotná poistka — núdzové vypnutie bloku'],
  0x00000080: ['err_f_main_fan_tacho_signal', 'Chýba tacho signál hlavného ventilátora'],
  0x00000100: ['err_f_aux_fan_tacho_signal', 'Chýba tacho signál pomocného ventilátora'],
  0x00000200: ['err_f_mixer_tacho_signal', 'Chýba tacho signál miešadla'],
  0x00000400: ['err_f_peltier_element_defective', 'Nemožno merať prúd pri aktívnych Peltierových článkoch'],
  0x00000800: ['err_f_pcb_temp_sensor_defective', 'Teplotu dosky nemožno zmerať'],
  0x00001000: ['err_f_cooler_temp_sensor_defective', 'Teplotu chladiča nemožno zmerať'],
  0x00002000: ['err_f_air_temp_sensor_defective', 'Teplotu prívodného vzduchu nemožno zmerať'],
  0x00004000: ['err_f_ADCI_reference', 'Referencia interného ADC je chybná'],
  0x00008000: ['err_f_ADCI_sensor_chain_broken', 'Prerušený senzorový reťazec interného ADC'],
  0x00010000: ['err_f_incompatible_firmware_image', 'Firmvér nekompatibilný s ID zariadenia v EEPROM'],
  0x00020000: ['err_f_cooler_temperature', 'Teplota odpadového vzduchu chladiča nad limitom (78 °C)'],
};
const TRANSIENT_ERRORS = {
  0x00000001: ['err_t_x_sensor_not_present', 'Externý teplotný senzor nerozpoznaný'],
  0x00000002: ['err_t_overcurrent', 'Nadprúd Peltierových článkov'],
  0x00000004: ['err_t_overtemp_sensor', 'Teplota senzora na bloku nad výstražným prahom'],
  0x00000008: ['err_t_pcb_temperature', 'Teplota dosky mimo rozsahu (-10 … 70 °C)'],
  0x00000010: ['err_t_air_temperature', 'Teplota prívodného vzduchu mimo rozsahu (-10 … 60 °C)'],
  0x00000020: ['err_t_pe_failure', 'PE relé sa nedá zopnúť (PE chyba, núdzový stop)'],
  0x00000040: ['err_t_power_frequency', 'Napätie a/alebo frekvencia mimo rozsahu'],
  0x00000080: ['err_t_x_sensor_out_of_range', 'Hodnoty externého senzora mimo rozsahu (-66 … 798 °C)'],
};

function decodeMask(mask, table) {
  if (mask == null) return [];
  const val = typeof mask === 'string' ? parseInt(mask, 16) : Number(mask);
  if (!val || isNaN(val)) return [];
  const low = val & 0x3FFFFFFF; // odstráň kategóriový bit (0x80000000 / 0x40000000)
  const out = [];
  for (const bit in table) {
    const b = Number(bit);
    if ((low & b) === b) out.push({ code: '0x' + b.toString(16).toUpperCase().padStart(8, '0'), name: table[bit][0], description: table[bit][1] });
  }
  return out;
}

// Pomôcka — nájdi zariadenie podľa ID.
async function findDevice(id) {
  return ThermalBath.findById(id);
}

// ── CRUD — konfigurácia zariadení ──
router.get('/', async (req, res) => {
  try { res.json(await ThermalBath.find().sort({ order: 1, name: 1 })); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
router.post('/', async (req, res) => {
  try { res.status(201).json(await ThermalBath.create(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', async (req, res) => {
  try {
    const d = await ThermalBath.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!d) return res.status(404).json({ error: 'Zariadenie nenájdené' });
    res.json(d);
  } catch (e) { res.status(400).json({ error: e.message }); }
});
router.delete('/:id', async (req, res) => {
  try { await ThermalBath.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Živý stav — agreguje viacero REST príkazov do jedného snapshotu ──
// GET /api/thermal-baths/:id/status
router.get('/:id/status', async (req, res) => {
  try {
    const d = await findDevice(req.params.id);
    if (!d) return res.status(404).json({ error: 'Zariadenie nenájdené' });

    // 3.1 referenčná teplota, 3.2 set point, 3.4 senzory + chyby, 3.7 stav kalibrácie
    const [ref, sp, tr, cal] = await Promise.all([
      tpRequest(d.ip, d.port, 'getRegister?register=TRset_TR'),
      tpRequest(d.ip, d.port, 'getRegister?register=TRset_SP'),
      tpRequest(d.ip, d.port, 'getTR'),
      tpRequest(d.ip, d.port, 'getCalibrationStatus'),
    ]);

    const online = ref.ok || sp.ok || tr.ok || cal.ok;
    if (!online) return res.json({ online: false, error: ref.error || 'Zariadenie nedostupné' });

    const firstValue = r => (r.ok && r.data && Array.isArray(r.data.values) && r.data.values[0]) ? r.data.values[0] : null;
    const refV = firstValue(ref);
    const spV = firstValue(sp);

    res.json({
      online: true,
      referenceTemp: refV ? refV.value : (tr.ok ? tr.data.TR_Ext : null),
      referenceTime: refV ? refV.times : null,
      setPoint: spV ? spV.value : null,
      setPointTime: spV ? spV.times : null,
      sensors: tr.ok ? {
        TR_Ext: tr.data.TR_Ext, TR_Int: tr.data.TR_Int,
        TR_Raw_Ext: tr.data.TR_Raw_Ext, TR_Raw_Int: tr.data.TR_Raw_Int,
      } : null,
      errors: tr.ok ? {
        fatal: decodeMask(tr.data.fatal_error_mask, FATAL_ERRORS),
        transient: decodeMask(tr.data.transient_error_mask, TRANSIENT_ERRORS),
        fatalMask: tr.data.fatal_error_mask, transientMask: tr.data.transient_error_mask,
      } : null,
      calibration: cal.ok ? cal.data : null,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Informácie o zariadení (3.5 getInfoReport) ──
router.get('/:id/info', async (req, res) => {
  try {
    const d = await findDevice(req.params.id);
    if (!d) return res.status(404).json({ error: 'Zariadenie nenájdené' });
    const r = await tpRequest(d.ip, d.port, 'getInfoReport');
    if (!r.ok) return res.json({ online: false, error: r.error });
    res.json({ online: true, info: r.data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Kalibračné funkcie (3.8 getShells) ──
router.get('/:id/shells', async (req, res) => {
  try {
    const d = await findDevice(req.params.id);
    if (!d) return res.status(404).json({ error: 'Zariadenie nenájdené' });
    const r = await tpRequest(d.ip, d.port, 'getShells', 6000);
    if (!r.ok) return res.json({ online: false, error: r.error });
    res.json({ online: true, shells: r.data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Nastavenie cieľovej teploty (3.3 setSP) ──
// POST /api/thermal-baths/:id/setpoint  { value: <°C> }
router.post('/:id/setpoint', async (req, res) => {
  try {
    const d = await findDevice(req.params.id);
    if (!d) return res.status(404).json({ error: 'Zariadenie nenájdené' });
    const value = Number(req.body && req.body.value);
    if (!isFinite(value)) return res.status(400).json({ error: 'Neplatná hodnota teploty' });
    const r = await tpRequest(d.ip, d.port, 'setSP?value=' + encodeURIComponent(value), 6000);
    if (!r.ok) return res.status(502).json({ error: r.error || 'Zariadenie neodpovedalo' });
    // Zariadenie vracia { value:"success", info:"25.5" } alebo chybu (napr. Remote access not permitted)
    if (r.data && r.data.value === 'success') return res.json({ ok: true, setPoint: parseFloat(r.data.info), raw: r.data });
    res.status(400).json({ ok: false, error: (r.data && (r.data.info || r.data.value)) || 'Nastavenie zlyhalo', raw: r.data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
