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

// Predvolené stĺpce štruktúrovaných tabuliek (editovateľné — labely aj počet stĺpcov).
// key = kľúč hodnoty v riadku, label = názov hlavičky, flex = pomer šírky, type = 'date' (voliteľné)
const TABLE_DEFS = {
  changeLog:       [{ key: 'version', label: 'Verzia', flex: 0.6 }, { key: 'change', label: 'Zmena', flex: 0.6 }, { key: 'date', label: 'Dátum', flex: 1, type: 'date' }, { key: 'reason', label: 'Dôvod zmeny', flex: 2 }, { key: 'author', label: 'Vypracoval', flex: 1.4 }],
  relatedDocs:     [{ key: 'document', label: 'Dokument / Norma', flex: 1.6 }, { key: 'description', label: 'Popis', flex: 2 }, { key: 'reference', label: 'Číslo / Odkaz', flex: 1.4 }],
  equipment:       [{ key: 'no', label: 'č.', flex: 0.5 }, { key: 'name', label: 'Názov položky', flex: 1.8 }, { key: 'description', label: 'Popis / P/N', flex: 2 }, { key: 'calibration', label: 'Kalibrácia', flex: 1 }],
  materials:       [{ key: 'no', label: 'č.', flex: 0.5 }, { key: 'name', label: 'Názov', flex: 1.6 }, { key: 'description', label: 'Popis', flex: 1.8 }, { key: 'partNumber', label: 'Sylex PN', flex: 1 }, { key: 'quantity', label: 'Množstvo', flex: 0.9 }],
  safety:          [{ key: 'risk', label: 'Riziko', flex: 1.4 }, { key: 'source', label: 'Zdroj', flex: 2 }, { key: 'measure', label: 'Opatrenie', flex: 2 }],
  waste:           [{ key: 'waste', label: 'Odpad', flex: 1.6 }, { key: 'category', label: 'Kategória', flex: 1.4 }, { key: 'disposal', label: 'Likvidácia', flex: 2 }],
  maintenance:     [{ key: 'equipment', label: 'Zariadenie', flex: 1.6 }, { key: 'interval', label: 'Interval', flex: 1 }, { key: 'task', label: 'Úkon', flex: 2.2 }, { key: 'responsible', label: 'Zodpovedný', flex: 1.2 }],
  troubleshooting: [{ key: 'problem', label: 'Problém', flex: 1.6 }, { key: 'cause', label: 'Príčina', flex: 2 }, { key: 'solution', label: 'Riešenie', flex: 2 }],
};

module.exports = { WARNING_TYPES, PPE_TYPES, TABLE_DEFS };
