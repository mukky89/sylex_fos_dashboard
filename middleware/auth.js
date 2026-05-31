const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'sylex-fos-dev-secret-change-me';

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const tok = (h.startsWith('Bearer ') ? h.slice(7) : null) || req.query.token;
  if (!tok) return res.status(401).json({ error: 'Neprihlásený' });
  try { req.user = jwt.verify(tok, SECRET); next(); }
  catch { return res.status(401).json({ error: 'Neplatný token' }); }
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Vyžaduje admin práva' });
  next();
}
module.exports = { requireAuth, requireAdmin, SECRET };
