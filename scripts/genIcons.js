// Vygeneruje PWA ikony (PNG) bez externých knižníc — pomocou zlib.
const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  // raw s filter bytami
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function makeIcon(N) {
  const px = Buffer.alloc(N * N * 4);
  const set = (x, y, r, g, b, a = 255) => {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = (y * N + x) * 4;
    // jednoduchý alpha blend nad pozadím
    const ba = a / 255;
    px[i]   = Math.round(px[i]   * (1 - ba) + r * ba);
    px[i+1] = Math.round(px[i+1] * (1 - ba) + g * ba);
    px[i+2] = Math.round(px[i+2] * (1 - ba) + b * ba);
    px[i+3] = 255;
  };
  // pozadie #0D1225
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = (y*N+x)*4; px[i]=13; px[i+1]=18; px[i+2]=37; px[i+3]=255; }
  // tri sínusové vlny (fiber optics motív)
  const waves = [
    { amp: 0.16, freq: 1.5, off: 0.00, col: [0,212,255], a: 255, t: Math.max(2, N*0.018) },
    { amp: 0.13, freq: 1.5, off: -0.10, col: [0,212,255], a: 110, t: Math.max(1, N*0.012) },
    { amp: 0.13, freq: 1.5, off: 0.10, col: [0,212,255], a: 110, t: Math.max(1, N*0.012) },
  ];
  for (const w of waves) {
    for (let x = Math.round(N*0.12); x < N*0.88; x++) {
      const ph = (x / N) * Math.PI * 2 * w.freq;
      const y = N/2 + Math.sin(ph) * N * w.amp + w.off * N;
      for (let dy = -w.t; dy <= w.t; dy++) set(x, Math.round(y+dy), w.col[0], w.col[1], w.col[2], w.a);
    }
  }
  // stredový bod
  const cx = N/2, cy = N/2, r = N*0.055;
  for (let y = Math.round(cy-r); y <= cy+r; y++) for (let x = Math.round(cx-r); x <= cx+r; x++)
    if ((x-cx)**2 + (y-cy)**2 <= r*r) set(x, y, 0, 212, 255, 255);
  return png(N, N, px);
}

fs.mkdirSync('public/img', { recursive: true });
fs.writeFileSync('public/img/icon-192.png', makeIcon(192));
fs.writeFileSync('public/img/icon-512.png', makeIcon(512));
console.log('Ikony vygenerované: icon-192.png, icon-512.png');
