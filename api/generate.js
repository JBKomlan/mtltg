import crypto from "node:crypto";

const ALGO      = "aes-256-gcm";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
const ID_LENGTH = 6; // longueur de l'identifiant court

/* ---------- Clé AES depuis SECRET_KEY ---------- */
function getKey() {
  const secret = process.env.SECRET_KEY;
  if (!secret) throw new Error("SECRET_KEY non définie.");
  return crypto.createHash("sha256").update(secret).digest();
}

/* ---------- Chiffrement AES-256-GCM ---------- */
function encrypt(payload) {
  const key    = getKey();
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc    = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

/* ---------- Génère un ID court URL-safe ---------- */
function shortId(length = ID_LENGTH) {
  // base62 : 0-9 A-Z a-z  →  62^6 = ~56 milliards de combinaisons
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes).map(b => chars[b % chars.length]).join("");
}

/* ---------- Appel Supabase REST ---------- */
async function supabaseInsert(row) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/transfer_links`;
  const res = await fetch(url, {
    method : "POST",
    headers: {
      "Content-Type" : "application/json",
      "apikey"       : process.env.SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      "Prefer"       : "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase insert error: ${err}`);
  }
}

/* ---------- Handler principal ---------- */
export default async function handler(req, res) {
  const {
    adminPass,
    mt, n1 = "", id1 = "", n2 = "", id2 = "",
    e = "0", f = "0", motif = "",
  } = req.query;

  // 1. Auth admin
  if (!adminPass || adminPass !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "Code de sécurité incorrect." });
  }

  // 2. Paramètres obligatoires
  if (!mt || (!n1 && !n2)) {
    return res.status(400).json({ error: "Paramètres manquants : mt et au moins n1 ou n2 requis." });
  }

  // 3. Payload → chiffrement
  const payload = { mt, n1, id1, n2, id2, e, f, motif, iat: Date.now() };
  let token;
  try {
    token = encrypt(payload);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // 4. ID court + stockage Supabase (retry si collision)
  let linkId;
  for (let attempt = 0; attempt < 5; attempt++) {
    linkId = shortId();
    try {
      await supabaseInsert({
        id        : linkId,
        token,
        expires_at: new Date(Date.now() + EXPIRY_MS).toISOString(),
      });
      break; // succès
    } catch (err) {
      if (attempt === 4) {
        return res.status(500).json({ error: "Impossible de générer un identifiant unique." });
      }
      // collision → on réessaie avec un nouvel ID
    }
  }

  // 5. URL courte finale
  const baseUrl = process.env.BASE_URL ?? "https://mtl-tg.vercel.app";
  const url = `${baseUrl}/transfer.html?id=${linkId}`;

  return res.status(200).json({ url });
}
