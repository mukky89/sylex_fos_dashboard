/**
 * Default header chip definitions.
 * Used by: server.js autoSeed  +  routes/admin.js reset-defaults endpoint
 */
const DEFAULT_LINKS = [
  { label: 'DBFOS',
    url:   'https://dbfos.sylex.sk',
    color: 'cyan', group: 'erp', order: 0, active: true, hasDot: true, pinned: true },

  { label: 'ISYS',
    url:   'https://isys.sylex.sk/',
    color: 'blue', group: 'erp', order: 1, active: true, hasDot: true, pinned: true },

  { label: 'PEAKLOGGER',
    url:   'https://mukovnik.xyz/',
    color: 'purple', group: 'custom', order: 2, active: true, hasDot: true,
    hasCredential: true, credentialKey: 'peaklogger' },

  { label: 'Dochádzka',
    url:   'https://syxapp03.sylex.sk/ads/',
    color: 'blue', group: 'custom', order: 3, active: true },

  { label: 'Obedy',
    url:   'https://apps.powerapps.com/play/e/default-1b7d6e4a-de27-4867-b238-3f03b4bdeaba/a/5c1bd016-047d-4068-a5d8-5b8ab6fbeca3?tenantId=1b7d6e4a-de27-4867-b238-3f03b4bdeaba',
    color: 'purple', group: 'custom', order: 4, active: true },

  { label: 'Obedy Fantozzi',
    url:   'http://dbfood.eu-4.evennode.com/',
    color: 'cyan', group: 'custom', order: 5, active: true },

  { label: 'Intranet',
    url:   'https://sylexba.sharepoint.com/sites/SYLEX-Intranet/SitePages/Home.aspx',
    color: 'sp', group: 'sharepoint', order: 6, active: true },

  { label: 'Telefónny zoznam',
    url:   'https://sylexba.sharepoint.com/sites/SYLEX-Intranet/Lists/Vedci%20oddelen/AllItems.aspx',
    color: 'sp', group: 'sharepoint', order: 7, active: true },

  { label: 'Pracovné postupy',
    url:   'https://sylexba.sharepoint.com/sites/SYLEX-Intranet/RD/RD/Forms/AllItems.aspx?id=%2Fsites%2FSYLEX%2DIntranet%2FRD%2FRD%2FPracovn%C3%A9%20Postupy%2FFOS&viewid=ed2522f9%2D6175%2D4038%2Db626%2D80eba011ca34',
    color: 'sp', group: 'sharepoint', order: 8, active: true },

  // ── Serverové priečinky (group: servery) — zobrazené v dropdowne "Súbory" ──
  { label: 'Projekty / Obchod',
    url:   'G:\\Projekty\\Obchod',
    color: 'cyan', group: 'servery', order: 9, active: true },

  { label: 'Projekty / FOS',
    url:   'G:\\Projekty\\FOS',
    color: 'cyan', group: 'servery', order: 10, active: true },
];

module.exports = { DEFAULT_LINKS };
