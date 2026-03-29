// api/verify.js
const crypto = require("crypto");

const SECRET = process.env.SECRET_KEY;

function sign(data) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");
}

export default function handler(req, res) {
  const { mt, n1, n2, d, s } = req.query;

  if (!mt || !n1 || !n2 || !d || !s) {
    return res.status(400).json({ valid: false, reason: "Paramètres manquants" });
  }

  const data = `${mt}|${n1}|${n2}|${d}`;
  const expected = sign(data);

  if (expected !== s) {
    return res.status(403).json({ valid: false, reason: "Signature invalide" });
  }

  const expired = (Date.now() - parseInt(d)) > (30 * 24 * 60 * 60 * 1000); // 30 jours

  res.status(200).json({
    valid: !expired,
    expired
  });
}
