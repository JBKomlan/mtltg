// api/generate.js
const crypto = require("crypto");

// Récupération de la clé secrète depuis les Environment Variables
const SECRET = process.env.SECRET_KEY;

function sign(data) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");
}

export default function handler(req, res) {
  const { mt, n1, n2, id1, id2 } = req.query;

  if (!mt || !n1 || !n2) {
    return res.status(400).json({ error: "Paramètres manquants" });
  }

  const d = Date.now(); // Timestamp de création

  const data = `${mt}|${n1}|${n2}|${d}`;
  const signature = sign(data);

  const url = `https://ton-projet.vercel.app/transfer.html?mt=${mt}&n1=${n1}&n2=${n2}&id1=${id1}&id2=${id2}&d=${d}&s=${signature}`;

  res.status(200).json({ url });
    }
