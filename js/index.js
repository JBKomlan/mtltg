let currentStep = 1;
const TOTAL_STEPS = 4;
let generatedUrl = '';

document.addEventListener("DOMContentLoaded", async () => {
  await initConfig();
  renderStepper();

  // Navigation
  document.getElementById('btnNext').addEventListener('click', () => {
    if (!validateByStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
      currentStep++;
      renderStepper();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  document.getElementById('btnBack').addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      renderStepper();
    }
  });

  // Calcul des frais en temps réel
  const updateFees = () => {
    const v = parseFloat(document.getElementById('montant').value) || 0;
    const isFraisChecked = document.getElementById('addFrais').checked;
    const row = document.getElementById('feesRow');
    
    if (isFraisChecked && v > 0) {
      const fees = Math.round(v * 0.01);
      document.getElementById('fBase').textContent = formatMontant(v);
      document.getElementById('fFees').textContent = formatMontant(fees);
      document.getElementById('fTotal').textContent = formatMontant(v + fees);
      row.classList.add('show');
    } else {
      row.classList.remove('show');
    }
  };

  document.getElementById('montant').addEventListener('input', updateFees);
  document.getElementById('addFrais').addEventListener('change', updateFees);

  // Génération finale
  document.getElementById('btnGenerate').addEventListener('click', generateLink);
});

/** Rendu visuel du Stepper */
function renderStepper() {
  document.querySelectorAll('.s-btn').forEach((btn, i) => {
    const n = i + 1;
    btn.classList.toggle('active', n === currentStep);
    btn.classList.toggle('done', n < currentStep);
  });
  
  document.getElementById('stepper').style.setProperty('--prog', (currentStep / TOTAL_STEPS * 100) + '%');
  document.getElementById('stepLabel').textContent = `Étape ${currentStep} / ${TOTAL_STEPS}`;
  document.querySelectorAll('.panel').forEach((p, i) => p.classList.toggle('active', i + 1 === currentStep));

  document.getElementById('btnBack').style.display = currentStep > 1 ? 'flex' : 'none';
  document.getElementById('btnNext').style.display = currentStep < TOTAL_STEPS ? 'flex' : 'none';
  document.getElementById('btnGenerate').style.display = currentStep === TOTAL_STEPS ? 'flex' : 'none';
}

/** Validation par étape */
function validateByStep(step) {
  if (step === 1) {
    const pass = document.getElementById('adminPass').value.trim();
    if (!pass) return alert("Code admin requis"), false;
    return true;
  }
  if (step === 2) {
    const mt = parseFloat(document.getElementById('montant').value);
    if (!mt || mt < 100) return alert("Montant invalide"), false;
    return true;
  }
  if (step === 3) {
    const n1 = document.getElementById('n1').value.trim();
    const n2 = document.getElementById('n2').value.trim();
    if (!n1 && !n2) return alert("Au moins un numéro requis"), false;
    if (n1 && !validerNumero(n1, 'tmoney')) return alert("Numéro Mixx invalide"), false;
    if (n2 && !validerNumero(n2, 'flooz')) return alert("Numéro Flooz invalide"), false;
    return true;
  }
  return true;
}

/** Appel API POST */
async function generateLink() {
  const btn = document.getElementById('btnGenerate');
  const payload = {
    adminPass: document.getElementById('adminPass').value.trim(),
    numClient: document.getElementById('numClient').value.trim(),
    montant: parseFloat(document.getElementById('montant').value),
    addFrais: document.getElementById('addFrais').checked,
    beneficiaires: {
      mixx: { numero: document.getElementById('n1').value.trim(), nom: document.getElementById('id1').value.trim() },
      flooz: { numero: document.getElementById('n2').value.trim(), nom: document.getElementById('id2').value.trim() }
    }
  };

  btn.disabled = true;
  btn.innerHTML = 'Génération...';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    generatedUrl = data.url;
    document.getElementById('generatedLink').textContent = generatedUrl;
    document.getElementById('resultBox').classList.add('show');
  } catch (err) {
    alert("Erreur: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⚡ Générer le lien';
  }
}
