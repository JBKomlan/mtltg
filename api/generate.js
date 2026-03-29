// api/generate.js  —  Vercel Serverless Function
// Corrigé : mélange require/export default → tout en ESM (import/export)

import crypto from "node:crypto";

const SECRET = process.env.SECRET_KEY;

/**
 * Signe les données avec HMAC-SHA256.
 * Les paramètres signés doivent correspondre exactement à ceux vérifiés dans verify.js.
 */
function sign(data) {
  if (!SECRET) throw new Error("SECRET_KEY non définie dans les variables d'environnement.");
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

export default function handler(req, res) {
  const { adminPass, mt, n1, n2, id1 = "", id2 = "", e = "0", f = "0" } = req.query;

  // ✅ Vérification du mot de passe admin côté serveur
  if (!adminPass || adminPass !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "Code de sécurité incorrect." });
  }

  if (!mt || (!n1 && !n2)) {
    return res.status(400).json({ error: "Paramètres manquants : mt et au moins n1 ou n2 sont requis." });
  }

  const d = Date.now();
  // ⚠️  Ordre et champs identiques à verify.js
  const data = `${n1}|${n2}|${mt}|${e}|${f}|${d}`;
  const signature = sign(data).substring(0, 15); // tronqué à 15 comme côté client

  const params = new URLSearchParams({ mt, n1, id1, n2, id2, e, f, d, s: signature });
  const baseUrl = process.env.BASE_URL ?? "https://mtl-tg.vercel.app";
  const url = `${baseUrl}/transfer.html?${params.toString()}`;

  return res.status(200).json({ url });
}
