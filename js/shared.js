let CONFIG = null;

/**
 * Charge la configuration.
 * Priorité : config.json > Fallback local (Togo)
 */
async function initConfig() {
  if (CONFIG) return CONFIG;
  try {
    const res = await fetch("/config.json");
    if (!res.ok) throw new Error();
    CONFIG = await res.json();
  } catch {
    // Configuration par défaut si le fichier est introuvable
    CONFIG = {
      regional_settings: {
        TG: {
          networks: {
            tmoney: { prefixes: ['90','91','92','93','70','71','72'] },
            flooz: { prefixes: ['79','96','97','98','99'] }
          }
        }
      }
    };
  }
  return CONFIG;
}

function getNetworkConfig(country, network) {
  return CONFIG?.regional_settings?.[country]?.networks?.[network] ?? null;
}

function validerNumero(num, network, country = "TG") {
  if (!num) return true;
  const n = String(num).trim();
  if (n.length !== 8 || !/^\d{8}$/.test(n)) return false;

  const cfg = getNetworkConfig(country, network);
  if (!cfg) return false;

  const prefix2 = n.substring(0, 2);
  return cfg.prefixes.includes(prefix2);
}

function formatMontant(n) {
  return Number(n).toLocaleString("fr-FR") + " FCFA";
}
