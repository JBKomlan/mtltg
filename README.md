# mtltg
Fichiers de données, mise à part des fichiers de logique et de style 
/**
 * TransferLink v4.2 — index.js
 * Logique de la page Admin : génération du lien via /api/generate (serveur)
 *
 * ✅  Aucune clé secrète dans ce fichier.
 *    L'authentification admin et la signature HMAC se font côté serveur Vercel.
 *
 * Dépend de : js/shared.js (chargé avant dans le HTML)
 */


TransferLink v4.2 — shared.js
 * Chargement de config.json + utilitaires communs
 */

/** Config chargée depuis config.json (rempli par initConfig())

/**
 * TransferLink v4.2 — transfer.js
 * Logique de la page Client : vérification via /api/verify (serveur) + affichage des boutons
 *
 * ✅  La clé secrète ne se trouve plus dans ce fichier ni dans le navigateur.
 *    La vérification HMAC se fait entièrement côté serveur (Vercel).
 *
 * Dépend de : js/shared.js (chargé avant dans le HTML)

 */

 Nouveau 
 /**
 * TransferLink v4.2 — transfer.js
 * Page client : reçoit ?token= (chiffré AES-256-GCM), appelle /api/verify,
 * affiche les boutons de paiement si le token est valide.
 *
 * ✅ Aucune donnée sensible lisible dans l'URL.
 * ✅ Aucune clé secrète dans ce fichier.
 *
 * Dépend de : js/shared.js

 */

 
