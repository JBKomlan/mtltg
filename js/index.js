
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await initConfig();
  } catch {
    alert("⚠️ Impossible de charger la configuration. Vérifiez que config.json est accessible.");
    return;
  }

  document.getElementById("btn-generer").addEventListener("click", generer);

  document.getElementById("n1").addEventListener("input", () =>
    liveValidate("n1", "tmoney", "hint-n1")
  );
  document.getElementById("n2").addEventListener("input", () =>
    liveValidate("n2", "flooz", "hint-n2")
  );
});

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

/* ---------- Génération du lien (appel API serveur) ---------- */
async function generer() {
  const btn = document.getElementById("btn-generer");

  // 1. Lecture des champs
  const adminPass  = document.getElementById("adminPass").value.trim();
  const cli        = document.getElementById("numClient").value.trim();
  const mtBase     = Math.floor(parseFloat(document.getElementById("montant").value) || 0);
  const n1         = document.getElementById("n1").value.trim();
  const id1        = document.getElementById("id1").value.trim();
  const n2         = document.getElementById("n2").value.trim();
  const id2        = document.getElementById("id2").value.trim();
  const isEditable = document.getElementById("allowEdit").checked ? "1" : "0";
  const hasFrais   = document.getElementById("addFrais").checked  ? "1" : "0";

  // 2. Validations côté client (rapides, avant d'appeler le serveur)
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

  // 3. Calcul montant final (les frais sont calculés aussi côté serveur pour cohérence)
  const mtFinal = hasFrais === "1" ? Math.ceil(mtBase * 1.01) : mtBase;

  // 4. ✅ Appel à /api/generate — la signature HMAC se fait sur le serveur
  btn.disabled    = true;
  btn.textContent = "⏳ Génération en cours…";

  let lienFinal;
  try {
    const apiRes = await fetch(
      `/api/generate?${new URLSearchParams({
        adminPass,          // le serveur vérifie le mot de passe via process.env.ADMIN_PASS
        mt: mtFinal,
        n1, id1, n2, id2,
        e: isEditable,
        f: hasFrais,
      }).toString()}`
    );

    const data = await apiRes.json();

    if (!apiRes.ok || data.error) {
      throw new Error(data.error ?? "Erreur serveur");
    }

    lienFinal = data.url;
  } catch (err) {
    alert("❌ " + err.message);
    return;
  } finally {
    btn.disabled    = false;
    btn.textContent = "Générer le lien sécurisé";
  }

  // 5. Construction du message WhatsApp
  const montantFormate = formatMontant(mtFinal);
  const guideText =
    `\n*N°* *${n1}*  *${n2}*\n` +
    `*Id.* ${id1 || id2}\n` +
    `*Montant:* [ *${montantFormate}* ]\n` +
    `_______________________\n` +
    `_*Cliquez sur le lien pour finaliser votre transfert.*_`;
  const msg = lienFinal + "\n" + guideText;

  // 6. Affichage résultat
  document.getElementById("resume").textContent = `Lien généré pour ${montantFormate}`;
  document.getElementById("waArea").innerHTML =
    `<a href="https://wa.me/${cli}?text=${encodeURIComponent(msg)}" target="_blank" class="wa-link">📲 Envoyer au client via WhatsApp</a>`;
  document.getElementById("result").style.display = "block";
  document.getElementById("result").scrollIntoView({ behavior: "smooth" });
}
