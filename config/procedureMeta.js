/**
 * Zdieľaný číselník pre Pracovné postupy — typy upozornení a ochranných pomôcok.
 * Používa: routes/procedures.js (Word export + /meta endpoint) a frontend (cez /api/procedures/meta).
 */
const WARNING_TYPES = [
  { key: 'manipulacia', label: 'Pozor pri manipulácii',     icon: '⚠️' },
  { key: 'chemikalia',  label: 'Pozor na chemikáliu',       icon: '🧪' },
  { key: 'horlavina',   label: 'Horľavá látka',             icon: '🔥' },
  { key: 'elektrina',   label: 'Elektrické nebezpečenstvo', icon: '⚡' },
  { key: 'horuce',      label: 'Horúci povrch',             icon: '♨️' },
  { key: 'ostre',       label: 'Ostré predmety',            icon: '🔪' },
  { key: 'tazke',       label: 'Ťažké bremeno',             icon: '🏋️' },
  { key: 'vybuch',      label: 'Nebezpečenstvo výbuchu',    icon: '💥' },
  { key: 'biologicke',  label: 'Biologické riziko',         icon: '☣️' },
  { key: 'ziarenie',    label: 'Žiarenie / laser',          icon: '🔆' },
  { key: 'pad',         label: 'Nebezpečenstvo pádu',       icon: '🪜' },
  { key: 'general',     label: 'Všeobecné upozornenie',     icon: '❗' },
];

const PPE_TYPES = [
  { key: 'okuliare',   label: 'Ochranné okuliare',     icon: '🥽' },
  { key: 'rukavice',   label: 'Ochranné rukavice',     icon: '🧤' },
  { key: 'helma',      label: 'Ochranná prilba',       icon: '⛑️' },
  { key: 'respirator', label: 'Respirátor / maska',    icon: '😷' },
  { key: 'sluch',      label: 'Ochrana sluchu',        icon: '🎧' },
  { key: 'obuv',       label: 'Pracovná obuv',         icon: '🥾' },
  { key: 'vesta',      label: 'Reflexná vesta / odev', icon: '🦺' },
  { key: 'stit',       label: 'Tvárový štít',          icon: '🛡️' },
  { key: 'plast',      label: 'Ochranný plášť',        icon: '🥼' },
];

module.exports = { WARNING_TYPES, PPE_TYPES };
