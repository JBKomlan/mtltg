// api/verify.js  —  Vercel Serverless Function
// Déchiffrement AES-256-GCM : reçoit le token opaque, déchiffre, vérifie l'expiration.

import crypto from "node:crypto";

const ALGO      = "aes-256-gcm";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

function getKey() {
  const secret = process.env.SECRET_KEY;
  if (!secret) throw new Error("SECRET_KEY non définie dans les variables d'environnement.");
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Déchiffre un token base64url → objet payload.
 * Lève une erreur si le token est altéré (authTag invalide).
 */
function decrypt(token) {
  const buf     = Buffer.from(token, "base64url");
  const iv      = buf.subarray(0, 12);       // 12 premiers octets
  const authTag = buf.subarray(12, 28);      // 16 octets suivants
  const data    = buf.subarray(28);          // reste = ciphertext

  const key      = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

export default function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ valid: false, reason: "Token manquant." });
  }

  let payload;
  try {
    payload = decrypt(token);
  } catch {
    // Échec du déchiffrement = token falsifié ou clé incorrecte
    return res.status(403).json({ valid: false, reason: "Token invalide ou falsifié." });
  }

  // Vérification expiration
  const expired = (Date.now() - payload.iat) > EXPIRY_MS;
  if (expired) {
    return res.status(200).json({ valid: false, expired: true, reason: "Lien expiré (30 jours)." });
  }

  // ✅ Token valide — on renvoie le payload déchiffré pour que transfer.html puisse l'utiliser
  return res.status(200).json({
    valid: true,
    expired: false,
    payload, // { mt, n1, id1, n2, id2, e, f, iat }
  });
}
