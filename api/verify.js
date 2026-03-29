

import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

/* ---------- Clé AES ---------- */
function getKey() {
  const secret = process.env.SECRET_KEY;
  if (!secret) throw new Error("SECRET_KEY non définie.");
  return crypto.createHash("sha256").update(secret).digest();
}

/* ---------- Déchiffrement AES-256-GCM ---------- */
function decrypt(token) {
  const buf     = Buffer.from(token, "base64url");
  const iv      = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const data    = buf.subarray(28);

  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(authTag);

  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}

/* ---------- Lecture Supabase ---------- */
async function supabaseGet(id) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/transfer_links?id=eq.${id}&select=token,expires_at`;
  const res = await fetch(url, {
    headers: {
      "apikey"       : process.env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error("Erreur Supabase.");
  const rows = await res.json();
  return rows[0] ?? null; // null si introuvable
}

/* ---------- Handler principal ---------- */
export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ valid: false, reason: "Identifiant manquant." });
  }

  // 1. Chercher le token dans Supabase
  let row;
  try {
    row = await supabaseGet(id);
  } catch {
    return res.status(500).json({ valid: false, reason: "Erreur de connexion à la base de données." });
  }

  if (!row) {
    return res.status(404).json({ valid: false, reason: "Lien introuvable." });
  }

  // 2. Vérifier l'expiration (double sécurité : Supabase + payload)
  if (new Date(row.expires_at) < new Date()) {
    return res.status(200).json({ valid: false, expired: true, reason: "Lien expiré (30 jours)." });
  }

  // 3. Déchiffrer le token
  let payload;
  try {
    payload = decrypt(row.token);
  } catch {
    return res.status(403).json({ valid: false, reason: "Token invalide ou falsifié." });
  }

  // 4. ✅ Tout est bon
  return res.status(200).json({ valid: true, expired: false, payload });
}
