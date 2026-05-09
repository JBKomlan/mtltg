document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initConfig();
  } catch {
    alert("⚠️ Impossible de charger la configuration. Vérifiez que config.json est accessible.");
    return;
  }

  /* ── Bouton générer ── */
  document.getElementById("btn-generer").addEventListener("click", generer);

  /* ── Validation temps réel numéros ── */
  document.getElementById("n1").addEventListener("input", () =>
    liveValidate("n1", "tmoney", "hint-n1")
  );
  document.getElementById("n2").addEventListener("input", () =>
    liveValidate("n2", "flooz", "hint-n2")
  );

  /* ── Type de transaction ── */
  document.querySelectorAll('input[name="transactionType"]').forEach(radio => {
    radio.addEventListener("change", () => {
      // Mise à jour visuelle des radio-cards
      document.querySelectorAll("#transactionTypeGroup .radio-card").forEach(c => c.classList.remove("active"));
      radio.closest(".radio-card").classList.add("active");
      // Affichage zone marchand
      const isMarchand = radio.value === "marchand";
      document.getElementById("marchandZone").style.display = isMarchand ? "block" : "none";
      // Mise à jour des labels bénéficiaires selon le mode
      updateBeneficiaireLabels(isMarchand);
    });
  });

  /* ── Nature du lien ── */
  document.querySelectorAll('input[name="linkNature"]').forEach(radio => {
    radio.addEventListener("change", () => {
      document.querySelectorAll("#linkNatureGroup .radio-card").forEach(c => c.classList.remove("active"));
      radio.closest(".radio-card").classList.add("active");
      const isPromo = radio.value === "promo";
      document.getElementById("promoDetailsZone").style.display = isPromo ? "block" : "none";
    });
  });

  /* ── Toggle fourchette de montants ── */
  document.getElementById("rangeToggleBtn").addEventListener("click", () => {
    const body  = document.getElementById("rangeBody");
    const arrow = document.getElementById("rangeArrow");
    const open  = body.style.display !== "none";
    body.style.display  = open ? "none" : "block";
    arrow.classList.toggle("open", !open);
  });

  /* ── Preview date expiration ── */
  const expiryInput = document.getElementById("expiryDays");
  updateExpiryPreview();
  expiryInput.addEventListener("input", updateExpiryPreview);
});

/* ---------- Mise à jour des labels bénéficiaires ---------- */
function updateBeneficiaireLabels(isMarchand) {
  // Labels des sections opérateurs
  document.querySelector(".net-section.tmoney label:first-of-type").innerHTML = isMarchand
    ? "🔵 Compte marchand Mixx <span class=\"label-hint\">(90 / 91 / 92 / 93 / 70 / 71 / 72)</span>"
    : "🔵 Mixx by Yas <span class=\"label-hint\">(90 / 91 / 92 / 93 / 70 / 71 / 72)</span>";

  document.querySelector(".net-section.flooz label:first-of-type").innerHTML = isMarchand
    ? "🟡 Compte marchand Flooz <span class=\"label-hint\">(79 / 96 / 97 / 98 / 99)</span>"
    : "🟡 Moov Money Flooz <span class=\"label-hint\">(79 / 96 / 97 / 98 / 99)</span>";

  // Placeholder champ nom
  document.getElementById("id1").placeholder = isMarchand ? "Nom du commerce (optionnel)" : "Nom du bénéficiaire (optionnel)";
  document.getElementById("id2").placeholder = isMarchand ? "Nom du commerce (optionnel)" : "Nom du bénéficiaire (optionnel)";
}

/* ---------- Preview de la date d'expiration ---------- */
function updateExpiryPreview() {
  const days = parseInt(document.getElementById("expiryDays").value) || 0;
  const preview = document.getElementById("expiryPreview");
  if (days > 0) {
    const date = new Date(Date.now() + days * 86400000);
    preview.textContent = "→ expire le " + date.toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric"
    });
  } else {
    preview.textContent = "";
  }
}

/* ---------- Validation temps réel des numéros ---------- */
function liveValidate(inputId, network, hintId) {
  const val  = document.getElementById(inputId).value.trim();
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
async function generer() {
  const btn = document.getElementById("btn-generer");

  // 1. Lecture des champs de base
  const adminPass  = document.getElementById("adminPass").value.trim();
  const cli        = document.getElementById("numClient").value.trim();
  const mtBase     = Math.floor(parseFloat(document.getElementById("montant").value) || 0);
  const n1         = document.getElementById("n1").value.trim();
  const id1        = document.getElementById("id1").value.trim();
  const n2         = document.getElementById("n2").value.trim();
  const id2        = document.getElementById("id2").value.trim();
  const isEditable = document.getElementById("allowEdit").checked ? "1" : "0";
  const hasFrais   = document.getElementById("addFrais").checked  ? "1" : "0";
  const motif      = document.getElementById("motive").value.trim();

  // 2. Lecture nouvelles options de configuration
  const transactionType = document.querySelector('input[name="transactionType"]:checked')?.value || "transfert";
  const linkNature      = document.querySelector('input[name="linkNature"]:checked')?.value || "general";
  const promoLabel      = document.getElementById("promoLabel").value.trim();
  const promoDescription = document.getElementById("promoDescription").value.trim();
  const expiryDays      = parseInt(document.getElementById("expiryDays").value) || 30;
  const showExpiry      = document.getElementById("showExpiry").checked ? "1" : "0";

  // Fourchette de montants (si activée)
  const rangeBodyVisible = document.getElementById("rangeBody").style.display !== "none";
  const minMontant = rangeBodyVisible ? (parseInt(document.getElementById("minMontant").value) || null) : null;
  const maxMontant = rangeBodyVisible ? (parseInt(document.getElementById("maxMontant").value) || null) : null;

  // 3. Validations
  if (!adminPass) return alert("⚠️ Veuillez saisir le code de sécurité admin.");
  if (!cli)       return alert("⚠️ Veuillez saisir le numéro WhatsApp du client.");
  if (!mtBase)    return alert("⚠️ Veuillez saisir un montant valide.");
  if (!n1 && !n2) return alert("⚠️ Veuillez saisir au moins un numéro de réception (Mixx ou Flooz).");

  if (n1 && !validerNumero(n1, "tmoney")) {
    return alert("❌ Numéro Mixx invalide (8 chiffres, préfixe 90/91/92/93/70/71/72).");
  }
  if (n2 && !validerNumero(n2, "flooz")) {
    return alert("❌ Numéro Flooz invalide (8 chiffres, préfixe 79/96/97/98/99).");
  }

  // Validation montant vs fourchette
  if (minMontant !== null && mtBase < minMontant) {
    return alert(`❌ Le montant (${formatMontant(mtBase)}) est inférieur au minimum autorisé (${formatMontant(minMontant)}).`);
  }
  if (maxMontant !== null && mtBase > maxMontant) {
    return alert(`❌ Le montant (${formatMontant(mtBase)}) dépasse le maximum autorisé (${formatMontant(maxMontant)}).`);
  }
  if (minMontant !== null && maxMontant !== null && minMontant > maxMontant) {
    return alert("❌ Le montant minimum ne peut pas dépasser le maximum.");
  }

  // Validation expiration
  if (expiryDays < 1 || expiryDays > 365) {
    return alert("❌ La durée de validité doit être comprise entre 1 et 365 jours.");
  }

  // 4. Calcul montant final
  const mtFinal = hasFrais === "1" ? Math.ceil(mtBase * 1.01) : mtBase;

  // 5. Appel API /generate
  btn.disabled    = true;
  btn.textContent = "⏳ Génération en cours…";

  let lienFinal;
  try {
    const params = new URLSearchParams({
      adminPass,
      mt: mtFinal,
      n1, id1, n2, id2,
      e: isEditable,
      f: hasFrais,
      motif,
      txType: transactionType,
      nature: linkNature,
      expiryDays,
      showExpiry,
    });

    // Ajout paramètres optionnels
    if (minMontant !== null) params.set("minMt", minMontant);
    if (maxMontant !== null) params.set("maxMt", maxMontant);
    if (linkNature === "promo" && promoLabel) {
      params.set("promoLabel", promoLabel);
      if (promoDescription) params.set("promoDesc", promoDescription);
    }

    const apiRes = await fetch(`/api/generate?${params.toString()}`);
    const data   = await apiRes.json();

    if (!apiRes.ok || data.error) throw new Error(data.error ?? "Erreur serveur");
    lienFinal = data.url;
  } catch (err) {
    alert("❌ " + err.message);
    return;
  } finally {
    btn.disabled    = false;
    btn.textContent = "Générer le lien sécurisé";
  }

  // 6. Construction du message WhatsApp
  const montantFormate = formatMontant(mtFinal);
  const ligneMotif  = motif      ? `*Motif:* ${motif}\n` : "";
  const lignePromo  = (linkNature === "promo" && promoLabel)
    ? `*Offre:* ${promoLabel}${promoDescription ? " — " + promoDescription : ""}\n`
    : "";
  const ligneType   = transactionType === "marchand" ? `*Type:* Paiement marchand\n` : "";

  const guideText =
    `\n*N°* *${n1}*  *${n2}*\n` +
    `*Id.* ${id1 || id2}\n` +
    `*Montant:* [ *${montantFormate}* ]\n` +
    ligneType +
    ligneMotif +
    lignePromo +
    `_______________________\n` +
    `_*Cliquez sur le lien pour finaliser votre transfert.*_`;

  const msg = lienFinal + "\n" + guideText;

  // 7. Affichage résultat
  document.getElementById("resume").textContent = `Lien généré pour ${montantFormate}`;
  document.getElementById("waArea").innerHTML =
    `<a href="https://wa.me/${cli}?text=${encodeURIComponent(msg)}" target="_blank" class="wa-link">📲 Envoyer au client via WhatsApp</a>`;
  document.getElementById("result").style.display = "block";
  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
}
