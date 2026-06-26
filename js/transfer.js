const COPY_ICON  = `<svg viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/></svg>`;
const OK_ICON    = `<svg viewBox="0 0 24 24" fill="#28a745"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
const PHONE_ICON = `<svg class="phone-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/><path d="M17 1v2c2.8 0 5 2.2 5 5h2c0-3.9-3.1-7-7-7zm0 4v2c.6 0 1 .4 1 1h2c0-1.7-1.3-3-3-3z"/></svg>`;

/* ── Drapeaux emoji des pays courants ── */
const COUNTRY_FLAGS = {
  TG: "🇹🇬", BJ: "🇧🇯", CI: "🇨🇮", SN: "🇸🇳", ML: "🇲🇱",
  BF: "🇧🇫", NE: "🇳🇪", GN: "🇬🇳", GH: "🇬🇭", NG: "🇳🇬",
  CM: "🇨🇲", FR: "🇫🇷", US: "🇺🇸", GB: "🇬🇧", DE: "🇩🇪",
};
const MAX_MONTANT = 505000;

document.addEventListener("DOMContentLoaded", async () => {
  const app = document.getElementById("app");

  try { await initConfig(); } catch {
    app.innerHTML = erreurHTML("⚠️ Impossible de charger la configuration.");
    return;
  }

  // 1. Lire l'ID dans l'URL
  const qs        = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const id        = qs.get("id") || pathParts[pathParts.length - 1] || null;

  if (!id) { app.innerHTML = erreurHTML("🚫 Lien invalide — identifiant manquant."); return; }

  // 2. Détection du pays (géolocalisation IP — non-bloquant)
  let countryCode = "TG"; // défaut Togo
  try {
    const geoRes = await Promise.race([
      fetch("https://ipapi.co/json/"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000))
    ]);
    if (geoRes.ok) {
      const geo = await geoRes.json();
      if (geo.country_code) countryCode = geo.country_code;
    }
  } catch { /* silencieux — on garde le défaut */ }

  // 3. Vérification serveur
  let verif;
  try {
    const res = await fetch(`/api/verify?id=${encodeURIComponent(id)}`);
    verif = await res.json();
  } catch {
    app.innerHTML = erreurHTML("⚠️ Impossible de charger le lien. Vérifiez votre connexion.");
    return;
  }

  if (!verif.valid) {
    const raison = verif.expired
      ? "Ce lien a dépassé sa période de validité."
      : "Ce lien est invalide ou a été falsifié.";
    app.innerHTML = erreurHTML(`🚫 Lien invalide ou expiré.<br><small>${raison}</small>`);
    return;
  }

  // 4. Payload disponible — construire l'UI
  const p = verif.payload;
  // Récupérer expires_at depuis verif si disponible (sinon calculé depuis iat + expiryDays)
  p._expiresAt = verif.expires_at || null;
  p._country   = countryCode;

  app.innerHTML = buildUI(p);

  // 5. Événements
  const mtField = document.getElementById("mtField");
  if (mtField) {
    mtField.addEventListener("input", () => {
      mtField.value = mtField.value.replace(/[.,]/g, "");
      checkPlafond(p);
      drawButtons(p);
    });
  }

  const fraisChk = document.getElementById("fraisChk");
  if (fraisChk) {
    fraisChk.addEventListener("change", () => {
      const row = document.getElementById("fraisRow");
      row.classList.toggle("active", fraisChk.checked);
      updateMontantDisplay(p);
      drawButtons(p);
    });
  }

  drawButtons(p);
});

/* ═══════════════════════════════════════════════════════
   Construction de l'UI complète
═══════════════════════════════════════════════════════ */
function buildUI(p) {
  const flag    = COUNTRY_FLAGS[p._country] || "🌍";
  const txLabel = p.txType === "marchand" ? "Paiement marchand" : "Transfert";
  const txCls   = p.txType === "marchand" ? "marchand" : "transfert";

  /* ── En-tête : pays + type de transaction ── */
  const headerBlock = `
    <div class="page-header">
      <div class="country-badge">
        <span class="country-flag">${flag}</span>
        <span>${p._country}</span>
      </div>
      <div class="tx-type-badge ${txCls}">
        ${p.txType === "marchand" ? "🏪" : "📤"} ${txLabel}
      </div>
    </div>`;

  /* ── Bannière promotion ── */
  let promoBlock = "";
  if (p.nature === "promo" && p.promoLabel) {
    let validiteStr = "";
    if (p._expiresAt) {
      const d = new Date(p._expiresAt);
      validiteStr = `<div class="promo-validity">
        🕐 Offre valable jusqu'au ${d.toLocaleDateString("fr-FR", {
          day: "2-digit", month: "long", year: "numeric"
        })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </div>`;
    }
    promoBlock = `
      <div class="promo-banner">
        <div class="promo-title">🎯 ${escHtml(p.promoLabel)}</div>
        ${p.promoDesc ? `<div class="promo-desc">${escHtml(p.promoDesc)}</div>` : ""}
        ${validiteStr}
      </div>`;
  }

  /* ── Date d'expiration (lien généraliste, si showExpiry=1) ── */
  let expiryNotice = "";
  if (p.showExpiry === "1" && p.nature !== "promo" && p._expiresAt) {
    const d = new Date(p._expiresAt);
    expiryNotice = `<div class="expiry-notice">
      🔒 Lien valide jusqu'au ${d.toLocaleDateString("fr-FR", {
        day: "2-digit", month: "short", year: "numeric"
      })}
    </div>`;
  }

  /* ── Montant ── */
  const isFraisInit = p.f === "1";
  let montantBlock;
  if (p.e === "0") {
    // Montant non modifiable — affichage seul
    montantBlock = `<div class="amount-display" id="amountDisplay">${formatMontant(p.mt)}</div>`;
  } else {
    // Montant éditable
    montantBlock = `
      <div class="input-fcfa">
        <input autofocus type="number" id="mtField" class="amount-input"
          value="${p.mt}" min="${p.mt}" max="${MAX_MONTANT}">
        <span>FCFA</span>
      </div>
      <div class="warn-plafond" id="warnPlafond">
        🚫 Montant maximum : ${formatMontant(MAX_MONTANT)}
      </div>`;
  }

  /* ── Option frais (visible dans les deux cas) ── */
  const fraisBlock = `
    <label class="frais-option${isFraisInit ? " active" : ""}" id="fraisRow">
      <input type="checkbox" id="fraisChk"${isFraisInit ? " checked" : ""}>
      📈 Support Partiel des Frais de Retrait (1 %)
    </label>`;

  /* ── Motif ── */
  const motifBlock = p.motif
    ? `<div class="motif-box">📝 <b>Motif :</b> ${escHtml(p.motif)}</div>`
    : "";

  return `
    ${headerBlock}
    ${promoBlock}
    ${expiryNotice}

    <img src="/img/1782451897003.png" alt="Money-TransferLink" class="logo-img">
    <span class="logo-text">Payment - Transfer USSD Link</span>

    <div class="reassurance">
      ℹ️ Après avoir cliqué, validez simplement l'appel sur votre téléphone.
    </div>

    <label style="font-size:12px; color:#718096;">Montant à régler (FCFA) :</label>
    ${montantBlock}
    ${fraisBlock}
    ${motifBlock}

    <div id="btns"></div>

    <div class="help-wrapper">
  <button type="button" class="help-toggle" id="helpToggle" onclick="toggleHelp()">
    ❔ Besoin d'aide ?
  </button>
  <div class="help-text" id="helpText" style="display:none;">
    💡 En cas de souci avec le bouton initiateur de transfert, cliquez sur l'icône de copie apparue 
    à droite après le clic du bouton pour coller le code manuellement dans votre clavier d'appel 
    et lancer l'appel sur la SIM convenable.
  </div>
</div>

    <div class="disclaimer">
      <b>Disclaimer :</b> Vérifiez le montant, le numéro et l'identité du destinataire
      avant toute validation finale. Nous déclinons toute responsabilité en cas d'une manipulation erronée.
    </div>

    <div class="footer-copy">&copy; ${new Date().getFullYear()} <b>Money TransferLink</b>. Tous droits réservés.</div>
  `;
}

/* ═══════════════════════════════════════════════════════
   Mise à jour du montant affiché (non éditable + frais)
═══════════════════════════════════════════════════════ */
function updateMontantDisplay(p) {
  const display = document.getElementById("amountDisplay");
  if (!display) return; // mode éditable — géré dans drawButtons
  const fraisChk = document.getElementById("fraisChk");
  const withFrais = fraisChk && fraisChk.checked;
  const mt = parseFloat(p.mt) || 0;
  const mtFinal = withFrais ? Math.ceil(mt * 1.01) : mt;
  display.textContent = formatMontant(mtFinal);
}

/* ═══════════════════════════════════════════════════════
   Vérification plafond 505 000 FCFA
═══════════════════════════════════════════════════════ */
function checkPlafond(p) {
  const mtField = document.getElementById("mtField");
  const warnEl  = document.getElementById("warnPlafond");
  if (!mtField || !warnEl) return;

  const val = parseFloat(mtField.value) || 0;
  const fraisChk = document.getElementById("fraisChk");
  const withFrais = fraisChk && fraisChk.checked;
  const effective = withFrais ? Math.ceil(val * 1.01) : val;

  if (effective > MAX_MONTANT) {
    mtField.style.borderColor = "#e53e3e";
    warnEl.style.display = "block";
    // Bloquer à MAX_MONTANT (on soustrait les frais si activés)
    const maxBase = withFrais ? Math.floor(MAX_MONTANT / 1.01) : MAX_MONTANT;
    mtField.value = maxBase;
  } else {
    mtField.style.borderColor = "";
    warnEl.style.display = "none";
  }
}

/* ═══════════════════════════════════════════════════════
   Rendu des boutons USSD
═══════════════════════════════════════════════════════ */

function drawButtons(p) {
  const btnsEl   = document.getElementById("btns");
  const mtField  = document.getElementById("mtField");
  const fraisChk = document.getElementById("fraisChk");

  const withFrais  = fraisChk && fraisChk.checked;
  const isMarchand = p.txType === "marchand";

  // Calcul du montant — commun aux deux modes
  let val = mtField
    ? (parseFloat(mtField.value) || 0)
    : (parseFloat(p.mt) || 0);

  if (withFrais) val = Math.ceil(val * 1.01);

  const minAutorise = parseFloat(p.mt) || 0;
  const suffixe     = withFrais ? "2" : "1";

  // Gardes-fous — communs aux deux modes
  if (val < minAutorise) {
    btnsEl.innerHTML = `<div class="warn-min">⚠️ Le montant ne peut pas être inférieur à ${formatMontant(minAutorise)}.</div>`;
    return;
  }
  if (val > MAX_MONTANT) {
    btnsEl.innerHTML = `<div class="warn-min">🚫 Montant maximum dépassé (${formatMontant(MAX_MONTANT)}).</div>`;
    return;
  }

  let html = "";

  if (isMarchand) {
    if (p.n1 && p.n1.length === 8) {
      const code  = `*145*5*${p.n1}*${val}#`;
      const label = `Mixx → ${p.n1}${p.id1 ? " · " + p.id1 : ""}`;
      html += btnRow("t", "tmoney", code, label, "/img/mixx-tg.png");
    }
    if (p.n2 && p.n2.length === 8) {
      const code  = `*155*2*2*${p.n2}*${val}#`;
      const label = `Flooz → ${p.n2}${p.id2 ? " · " + p.id2 : ""}`;
      html += btnRow("m", "flooz", code, label, "/img/flooz-tg.png");
    }
  } else {
    if (p.n1 && p.n1.length === 8) {
      const code  = `*145*1*${val}*${p.n1}*${suffixe}#`;
      const label = `Mixx → ${p.n1}${p.id1 ? " · " + p.id1 : ""}`;
      html += btnRow("t", "tmoney", code, label, "/img/mixx-tg.png");
    }
    if (p.n2 && p.n2.length === 8) {
      const code  = `*155*1*1*${p.n2}*${p.n2}*${val}*${suffixe}#`;
      const label = `Flooz → ${p.n2}${p.id2 ? " · " + p.id2 : ""}`;
      html += btnRow("m", "flooz", code, label, "/img/flooz-tg.png");
    }
  }

  btnsEl.innerHTML = html;

  // ── Auto-dial : ouvre le composeur au premier rendu ──
  if (!window._autoDialDone) {
    window._autoDialDone = true;
    const firstLink = btnsEl.querySelector("a.btn-pay");
    if (firstLink) {
      setTimeout(() => firstLink.click(), 300);
    }
} 
}
/* ═══════════════════════════════════════════════════════
   Ligne bouton + icône copie
═══════════════════════════════════════════════════════ */
function btnRow(id, cls, code, label, logoUrl) {
  const telHref = "tel:" + code.replace(/#/g, "%23");
  return `
    <div class="btn-container">
      <a href="${telHref}" class="btn-pay ${cls}" onclick="showCopy('${id}')">
        ${PHONE_ICON}
        <img src="${logoUrl}" class="operator-logo" alt="">
        ${label}
      </a>
      <button id="cp-${id}" class="btn-copy" onclick="copyToClipboard(this, '${code}')" title="Copier le code USSD">
        ${COPY_ICON}
      </button>
    </div>`;
}

function showCopy(id) {
  setTimeout(() => {
    const btn = document.getElementById("cp-" + id);
    if (btn) btn.style.display = "flex";
  }, 500);
}

function copyToClipboard(btn, code) {
  navigator.clipboard.writeText(code).then(() => {
    const old = btn.innerHTML;
    btn.innerHTML = OK_ICON;
    setTimeout(() => { btn.innerHTML = old; }, 2000);
  }).catch(() => {
    alert("Copie non disponible. Code : " + code);
  });
}

function erreurHTML(msg) {
  return `<div class="state-error"><h3>${msg}</h3></div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function toggleHelp() {
  const txt = document.getElementById("helpText");
  const btn = document.getElementById("helpToggle");
  const isHidden = txt.style.display === "none";
  txt.style.display = isHidden ? "block" : "none";
  btn.textContent = isHidden ? "✖ Fermer l'aide" : "❔ Besoin d'aide ?";
}

// Ferme l'aide si on clique en dehors du wrapper
document.addEventListener("click", (e) => {
  const wrapper = document.querySelector(".help-wrapper");
  const txt = document.getElementById("helpText");
  if (!wrapper || !txt || txt.style.display === "none") return;

  if (!wrapper.contains(e.target)) {
    txt.style.display = "none";
    document.getElementById("helpToggle").textContent = "❔ Besoin d'aide ?";
  }
});
