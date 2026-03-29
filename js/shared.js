/**
 * TransferLink v4.2 — shared.js
 * Chargement de config.json + utilitaires communs
 */

/** Config chargée depuis config.json (rempli par initConfig()) */
let CONFIG = null;

/**
 * Charge config.json et stocke le résultat.
 * @returns {Promise<object>} config
 */
async function initConfig() {
  if (CONFIG) return CONFIG;
  const res = await fetch("config.json");
  if (!res.ok) throw new Error("Impossible de charger config.json");
  CONFIG = await res.json();
  return CONFIG;
}

/**
 * Retourne la config réseau pour le pays et l'opérateur.
 * @param {string} country - ex: "TG"
 * @param {string} network - ex: "tmoney" | "flooz"
 */
function getNetworkConfig(country, network) {
  return CONFIG?.regional_settings?.[country]?.networks?.[network] ?? null;
}

/**
 * Valide un numéro selon les préfixes définis dans config.json.
 * @param {string} num      - numéro 8 chiffres
 * @param {string} network  - "tmoney" | "flooz"
 * @param {string} country  - "TG"
 * @returns {boolean}
 */
function validerNumero(num, network, country = "TG") {
  if (!num) return true; // champ optionnel
  const n = String(num).trim();
  if (n.length !== 8 || !/^\d{8}$/.test(n)) return false;

  const cfg = getNetworkConfig(country, network);
  if (!cfg) return false;

  const prefix2 = n.substring(0, 2);
  return cfg.prefixes.includes(prefix2);
}

/**
 * Remplace les placeholders {{key}} dans un template.
 * @param {string} tpl
 * @param {object} vars
 */
function fillTemplate(tpl, vars) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

/** Formate un montant en FCFA */
function formatMontant(n) {
  return Number(n).toLocaleString("fr-FR") + " FCFA";
}
