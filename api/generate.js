// api/generate.js  —  Vercel Serverless Function
// Chiffrement AES-256-GCM : tous les paramètres sont encapsulés dans un token opaque.
// Le lien final ressemble à : /transfer.html?token=xxxxxxxxxxxx
// Rien n'est lisible en clair dans l'URL.

import crypto from "node:crypto";

const ALGO      = "aes-256-gcm";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

/**
 * Dérive une clé AES-256 depuis SECRET_KEY via SHA-256.
 * Garantit exactement 32 octets quelle que soit la longueur de SECRET_KEY.
 */
function getKey() {
  const secret = process.env.SECRET_KEY;
  if (!secret) throw new Error("SECRET_KEY non définie dans les variables d'environnement.");
  return crypto.createHash("sha256").update(secret).digest(); // Buffer 32 octets
}

/**
 * Chiffre un objet JSON en token URL-safe (base64url).
 * Format : iv(12 octets) + authTag(16 octets) + ciphertext
 */
function encrypt(payload) {
  const key    = getKey();
  const iv     = crypto.randomBytes(12); // 96 bits — recommandé pour GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const json      = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const authTag   = cipher.getAuthTag(); // 16 octets — garantit l'intégrité

  // iv || authTag || ciphertext → base64url (sans +, /, =)
  return Buffer.concat([iv, authTag, encrypted]).toString("base64url");
}

export default function handler(req, res) {
  const {
    adminPass,
    mt, n1 = "", id1 = "", n2 = "", id2 = "",
    e = "0", f = "0",
  } = req.query;

  // 1. Authentification admin (côté serveur)
  if (!adminPass || adminPass !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "Code de sécurité incorrect." });
  }

  // 2. Paramètres obligatoires
  if (!mt || (!n1 && !n2)) {
    return res.status(400).json({ error: "Paramètres manquants : mt et au moins n1 ou n2 sont requis." });
  }

  // 3. Payload — tout ce dont transfer.html a besoin, chiffré ensemble
  const payload = {
    mt,
    n1, id1,
    n2, id2,
    e,
    f,
    iat: Date.now(), // issued at — pour l'expiration 30 jours
  };

  // 4. Chiffrement AES-256-GCM
  let token;
  try {
    token = encrypt(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // 5. URL finale — un seul paramètre opaque, rien de lisible
  const baseUrl = process.env.BASE_URL ?? "https://mtl-tg.vercel.app";
  const url = `${baseUrl}/transfer.html?token=${token}`;

  return res.status(200).json({ url });
}
