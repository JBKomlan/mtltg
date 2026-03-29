// api/verify.js  —  Vercel Serverless Function
// Corrigé : mélange require/export default → tout en ESM (import/export)
// Corrigé : ordre des champs de signature aligné avec generate.js

import crypto from "node:crypto";

const SECRET     = process.env.SECRET_KEY;
const EXPIRY_MS  = 30 * 24 * 60 * 60 * 1000; // 30 jours

function sign(data) {
  if (!SECRET) throw new Error("SECRET_KEY non définie dans les variables d'environnement.");
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

export default function handler(req, res) {
  const { mt, n1 = "", n2 = "", e = "0", f = "0", d, s } = req.query;

  if (!mt || !d || !s) {
    return res.status(400).json({ valid: false, reason: "Paramètres manquants : mt, d et s sont requis." });
  }

  // ⚠️  Ordre et champs identiques à generate.js
  const data     = `${n1}|${n2}|${mt}|${e}|${f}|${d}`;
  const expected = sign(data).substring(0, 15);

  if (expected !== s) {
    return res.status(403).json({ valid: false, reason: "Signature invalide." });
  }

  const expired = (Date.now() - parseInt(d, 10)) > EXPIRY_MS;

  return res.status(200).json({ valid: !expired, expired });
}
