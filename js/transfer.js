

const COPY_ICON = `<svg viewBox="0 0 24 24"><path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"/></svg>`;
const OK_ICON   = `<svg viewBox="0 0 24 24" fill="#28a745"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`;

document.addEventListener("DOMContentLoaded", async () => {
  const app = document.getElementById("app");

  // 1. Charger config.json
  try {
    await initConfig();
  } catch {
    app.innerHTML = erreurHTML("⚠️ Impossible de charger la configuration.");
    return;
  }

  // 2. Lire les paramètres d'URL
  const qs = new URLSearchParams(window.location.search);
  const p = {
    mt:  qs.get("mt"),
    n1:  qs.get("n1")  ?? "",
    id1: qs.get("id1") ?? "",
    n2:  qs.get("n2")  ?? "",
    id2: qs.get("id2") ?? "",
    e:   qs.get("e"),
    f:   qs.get("f"),
    d:   qs.get("d"),
    s:   qs.get("s"),
  };

  // 3. Paramètres minimaux présents ?
  if (!p.mt || !p.d || !p.s) {
    app.innerHTML = erreurHTML("🚫 Lien invalide — paramètres manquants.");
    return;
  }

  // 4. ✅ Vérification via l'API serveur (la clé ne quitte jamais Vercel)
  let verif;
  try {
    const apiRes = await fetch(
      `/api/verify?${new URLSearchParams({ mt: p.mt, n1: p.n1, n2: p.n2, e: p.e, f: p.f, d: p.d, s: p.s }).toString()}`
    );
    verif = await apiRes.json();
  } catch {
    app.innerHTML = erreurHTML("⚠️ Impossible de vérifier le lien. Vérifiez votre connexion.");
    return;
  }

  if (!verif.valid) {
    const raison = verif.expired
      ? "Ce lien a dépassé sa période de validité de 30 jours."
      : "Ce lien n'est pas certifié ou a été modifié.";
    app.innerHTML = erreurHTML(`🚫 Lien invalide ou expiré.<br><small>${raison}</small>`);
    return;
  }

  // 5. Lien valide → afficher l'UI
  app.innerHTML = buildUI(p);

  const mtField = document.getElementById("mtField");
  mtField.addEventListener("input", () => drawButtons(p));
  drawButtons(p);
});

/* ---------- Construction de l'UI principale ---------- */
function buildUI(p) {
  const readonlyAttr = p.e === "0" ? "readonly" : "";
  return `
    <img src="https://raw.githubusercontent.com/JBKomlan/mtl/main/logomtl.png" alt="Logo TransferLink" class="logo-img">
    <span class="logo-text">★ TransferLink</span>

    <div class="reassurance">
      ℹ️ Après avoir cliqué, validez simplement l'appel sur votre téléphone.
    </div>

    <label for="mtField" style="font-size:12px; color:#718096;">Montant à régler (FCFA) :</label>
    <input type="number" id="mtField" class="amount-input" value="${p.mt}" min="${p.mt}" ${readonlyAttr}>

    <div id="btns"></div>

    <div class="help-text">
      💡 En cas de souci avec le bouton de transfert, utilisez l'icône de copie qui apparaît à droite
      après le clic, pour coller le code manuellement dans votre clavier d'appel.
    </div>

    <a href="https://wa.me/22898390629?text=${encodeURIComponent("Salut, Je viens de découvrir TransferLink. J'aimerais en savoir plus pour booster mon business en ligne.")}"
       target="_blank" rel="noopener" class="btn-wa-promo">
      🟢 Obtenir mon propre lien TransferLink
    </a>

    <div class="disclaimer">
      <b>Disclaimer :</b> L'initiative TransferLink vise à rapprocher le Mobile Money des réseaux sociaux et à
      simplifier les transferts d'argent. Veuillez vérifier le montant, le numéro et l'identité du destinataire
      avant toute validation finale. Nous déclinons toute responsabilité en cas d'erreur de saisie.
    </div>

    <div class="footer-copy">&copy; ${new Date().getFullYear()} <b>TransferLink</b>. Tous droits réservés.</div>
  `;
}

/* ---------- Rendu des boutons selon le montant saisi ---------- */
function drawButtons(p) {
  const btnsEl   = document.getElementById("btns");
  const val       = parseFloat(document.getElementById("mtField").value) || 0;
  const minAutorise = parseFloat(p.mt) || 0;
  const suffixe   = p.f === "1" ? "2" : "1";

  if (val < minAutorise) {
    btnsEl.innerHTML = `<div class="warn-min">⚠️ Le montant ne peut pas être inférieur à ${formatMontant(minAutorise)}.</div>`;
    return;
  }

  let html = "";

  // --- Mixx by Yas (T-Money) ---
  if (p.n1 && p.n1.length === 8) {
    const code = `*145*1*${val}*${p.n1}*${suffixe}#`;
    const label = `🔵 MiXX → ${p.n1}${p.id1 ? " · " + p.id1 : ""}`;
    html += btnRow("t", "tmoney", code, label, p.n1.replace(/#/g, "%23"));
  }

  // --- Moov Money Flooz ---
  if (p.n2 && p.n2.length === 8) {
    const code = `*155*1*1*${p.n2}*${p.n2}*${val}*${suffixe}#`;
    const label = `🟡 FlOOZ → ${p.n2}${p.id2 ? " · " + p.id2 : ""}`;
    html += btnRow("m", "flooz", code, label, p.n2.replace(/#/g, "%23"));
  }

  btnsEl.innerHTML = html;
}

/* ---------- Génère une ligne bouton + icône copie ---------- */
function btnRow(id, cls, code, label, telCode) {
  const telHref = "tel:" + code.replace(/#/g, "%23");
  return `
    <div class="btn-container">
      <a href="${telHref}" class="btn-pay ${cls}" onclick="showCopy('${id}')">${label}</a>
      <button id="cp-${id}" class="btn-copy" onclick="copyToClipboard(this, '${code}')" title="Copier le code USSD">
        ${COPY_ICON}
      </button>
    </div>`;
}

/* ---------- Affiche le bouton copie après un clic de paiement ---------- */
function showCopy(id) {
  setTimeout(() => {
    const btn = document.getElementById("cp-" + id);
    if (btn) btn.style.display = "flex";
  }, 500);
}

/* ---------- Copie le code USSD dans le presse-papier ---------- */
function copyToClipboard(btn, code) {
  navigator.clipboard.writeText(code).then(() => {
    const old = btn.innerHTML;
    btn.innerHTML = OK_ICON;
    setTimeout(() => { btn.innerHTML = old; }, 2000);
  }).catch(() => {
    alert("Copie non disponible. Code : " + code);
  });
}

/* ---------- HTML d'erreur ---------- */
function erreurHTML(msg) {
  return `<div class="state-error"><h3>${msg}</h3></div>`;
}
