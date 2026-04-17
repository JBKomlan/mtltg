const COPY_ICON = `<svg viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/></svg>`;
const OK_ICON   = `<svg viewBox="0 0 24 24" fill="#28a745"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;
const PHONE_ICON = `<svg class="phone-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/><path d="M17 1v2c2.8 0 5 2.2 5 5h2c0-3.9-3.1-7-7-7zm0 4v2c.6 0 1 .4 1 1h2c0-1.7-1.3-3-3-3z"/></svg>`;

document.addEventListener("DOMContentLoaded", async () => {
  const app = document.getElementById("app");

  // 1. Charger config.json
  try {
    await initConfig();
  } catch {
    app.innerHTML = erreurHTML("⚠️ Impossible de charger la configuration.");
    return;
  }

  // 2. Lire l'identifiant court dans l'URL
  const qs = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const id = qs.get("id") || pathParts[pathParts.length - 1] || null;

  if (!id) {
    app.innerHTML = erreurHTML("🚫 Lien invalide — identifiant manquant.");
    return;
  }

  // 3. Vérification côté serveur : Supabase → déchiffrement → payload
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
      ? "Ce lien a dépassé sa période de validité de 30 jours."
      : "Ce lien est invalide ou a été falsifié.";
    app.innerHTML = erreurHTML(`🚫 Lien invalide ou expiré.<br><small>${raison}</small>`);
    return;
  }

  // 4. Payload déchiffré disponible — afficher l'interface
  const p = verif.payload; // { mt, n1, id1, n2, id2, e, f, iat }
  app.innerHTML = buildUI(p);

  const mtField = document.getElementById("mtField");
  if (mtField) {
    mtField.addEventListener("input", () => {
  mtField.value = mtField.value.replace(/[.,]/g, "");
  drawButtons(p);
  });
     
};
  }
  drawButtons(p);


/* ---------- Construction de l'UI ---------- */
function buildUI(p) {
  const motifBlock = p.motif
    ? `<div class="motif-box">📝 <b>Motif :</b> ${p.motif}</div>`
    : "";

  // Montant : formaté en lecture seule, ou input éditable
  const montantBlock = p.e === "0"
    ? `<div class="amount-display">${formatMontant(p.mt)}</div>`
    : `<div class="input-fcfa">
         <input autofocus type="number" id="mtField" class="amount-input" value="${p.mt}" min="${p.mt}">
         <span>FCFA</span>
       </div>`;

  return `
    <img src="/img/mtl.png" alt="Money-TransferLink" class="logo-img">
    <span class="logo-text">*****</span>

    <div class="reassurance">
      ℹ️ Après avoir cliqué, validez simplement l'appel sur votre téléphone.
    </div>

    <label style="font-size:12px; color:#718096;">Montant à régler (FCFA) :</label>
    ${montantBlock}

    ${motifBlock}

    <div id="btns"></div>

    <div class="help-text">
      💡 En cas de souci avec le bouton de transfert, utilisez l'icône de copie qui apparaît
      à droite après le clic, pour coller le code manuellement dans votre clavier d'appel.
    </div>

    <a href="https://wa.me/22898390629?text=${encodeURIComponent("Salut, Je viens de découvrir TransferLink. J'aimerais en savoir plus pour booster mon business en ligne.")}"
       target="_blank" rel="noopener" class="btn-wa-promo">
      🟢 Obtenir un lien "Money TransferLink"
    </a>

    <div class="disclaimer">
      <b>Disclaimer :</b> Vérifiez le montant, le numéro et l'identité du destinataire
      avant toute validation finale. Nous déclinons toute responsabilité en cas d'une manipulation erronée.
    </div>

    <div class="footer-copy">&copy; ${new Date().getFullYear()} <b>Money TransferLink</b>. Tous droits réservés.</div>
  `;
}

/* ---------- Rendu des boutons USSD ---------- */
function drawButtons(p) {
  const btnsEl      = document.getElementById("btns");
  const mtField     = document.getElementById("mtField");
  const val         = mtField ? parseFloat(mtField.value) || 0 : parseFloat(p.mt) || 0;
  const minAutorise = parseFloat(p.mt) || 0;
  const suffixe     = p.f === "1" ? "2" : "1";

  if (val < minAutorise) {
    btnsEl.innerHTML = `<div class="warn-min">⚠️ Le montant ne peut pas être inférieur à ${formatMontant(minAutorise)}.</div>`;
    return;
  }

  let html = "";

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

  btnsEl.innerHTML = html;
}

/* ---------- Ligne bouton + icône copie ---------- */
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
