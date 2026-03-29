/**
 * TransferLink v4.2 — index.js
 * Logique de la page Admin : génération du lien sécurisé
 *
 * Dépend de : js/shared.js (chargé avant dans le HTML)
 */

/* ------------------------------------------------------------------ *
 *  SÉCURITÉ : ne jamais laisser la clé en dur dans le code source !   *
 *  En production → utilisez l'API /api/generate (HMAC + env var).    *
 *  Cette valeur n'est ici que pour le mode "standalone / offline".   *
 * ------------------------------------------------------------------ */
const CLE_ADMIN = "fd2026!tg"; // TODO: remplacer par appel API

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initConfig();
  } catch (e) {
    alert("⚠️ Impossible de charger la configuration. Vérifiez que config.json est accessible.");
    return;
  }

  document.getElementById("btn-generer").addEventListener("click", generer);

  // Validation temps réel sur les champs numéro
  document.getElementById("n1").addEventListener("input", () =>
    liveValidate("n1", "tmoney", "hint-n1")
  );
  document.getElementById("n2").addEventListener("input", () =>
    liveValidate("n2", "flooz", "hint-n2")
  );
});

/* ---------- Validation temps réel ---------- */
function liveValidate(inputId, network, hintId) {
  const val = document.getElementById(inputId).value.trim();
  const hint = document.getElementById(hintId);
  if (!val) { hint.style.display = "none"; return; }

  if (!validerNumero(val, network)) {
    hint.textContent = network === "tmoney"
      ? "❌ Doit commencer par 90/91/92/93/70/71/72 (8 chiffres)"
      : "❌ Doit commencer par 79/96/97/98/99 (8 chiffres)";
    hint.style.display = "block";
  } else {
    hint.style.display = "none";
  }
}

/* ---------- Génération du lien ---------- */
function generer() {
  // 1. Auth admin
  const passSaisi = document.getElementById("adminPass").value.trim();
  if (passSaisi !== CLE_ADMIN) {
    return alert("❌ Code de sécurité incorrect.");
  }

  // 2. Lecture des champs
  const cli    = document.getElementById("numClient").value.trim();
  const mtBase = Math.floor(parseFloat(document.getElementById("montant").value) || 0);
  const n1     = document.getElementById("n1").value.trim();
  const id1    = document.getElementById("id1").value.trim();
  const n2     = document.getElementById("n2").value.trim();
  const id2    = document.getElementById("id2").value.trim();

  const isEditable = document.getElementById("allowEdit").checked ? "1" : "0";
  const hasFrais   = document.getElementById("addFrais").checked  ? "1" : "0";

  // 3. Validations
  if (!cli)    return alert("⚠️ Veuillez saisir le numéro WhatsApp du client.");
  if (!mtBase) return alert("⚠️ Veuillez saisir un montant valide.");
  if (!n1 && !n2) return alert("⚠️ Veuillez saisir au moins un numéro de réception (Mixx ou Flooz).");

  if (n1 && !validerNumero(n1, "tmoney")) {
    return alert("❌ Numéro Mixx invalide (8 chiffres, préfixe 90/91/92/93/70/71/72).");
  }
  if (n2 && !validerNumero(n2, "flooz")) {
    return alert("❌ Numéro Flooz invalide (8 chiffres, préfixe 79/96/97/98/99).");
  }

  // 4. Calcul montant final
  const mtFinal = hasFrais === "1" ? Math.ceil(mtBase * 1.01) : mtBase;
  const dateGen = Date.now();

  // 5. Signature
  const signature = signClient(
    [n1, n2, mtFinal, isEditable, hasFrais, dateGen],
    CLE_ADMIN
  );

  // 6. Construction du lien
  const base = window.location.href.substring(0, window.location.href.lastIndexOf("/"));
  const params = new URLSearchParams({ mt: mtFinal, n1, id1, n2, id2, e: isEditable, f: hasFrais, d: dateGen, s: signature });
  const lienFinal = base + "/transfer.html?" + params.toString();

  // 7. Message WhatsApp
  const montantFormate = formatMontant(mtFinal);
  const guideText =
    `\n*N°* *${n1}*  *${n2}*\n` +
    `*Id.* ${id1 || id2}\n` +
    `*Montant:* [ *${montantFormate}* ]\n` +
    `_______________________\n` +
    `_*Cliquez sur le lien pour finaliser votre transfert.*_`;
  const msg = lienFinal + "\n" + guideText;

  // 8. Affichage résultat
  document.getElementById("resume").textContent = `Lien généré pour ${montantFormate}`;
  document.getElementById("waArea").innerHTML =
    `<a href="https://wa.me/${cli}?text=${encodeURIComponent(msg)}" target="_blank" class="wa-link">📲 Envoyer au client via WhatsApp</a>`;
  document.getElementById("result").style.display = "block";
  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
}
