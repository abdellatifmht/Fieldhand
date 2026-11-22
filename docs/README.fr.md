# Fieldhand · Guide français

## Installation locale

Développement : Node 22.19 ou plus. Utilisation : Chrome, Edge ou Brave 120 ou plus.

1. Exécuter `npm ci` puis `npm run build` dans le projet.
2. Ouvrir `chrome://extensions` ou `edge://extensions` et activer le mode développeur.
3. Cliquer sur **Charger l’extension non empaquetée** et sélectionner le dossier `dist`.
4. Épingler Fieldhand. Ouvrir le popup, puis **Gérer les profils**.
5. Saisir ses coordonnées et **Enregistrer le profil**. Les données ne sont pas chiffrées.

## Utilisation

Sur un site HTTP(S), choisir un profil dans le popup, puis **Remplir ce formulaire**. Les valeurs déjà saisies sont conservées par défaut. Le badge et le message indiquent le nombre de champs remplis. **Annuler** restaure la dernière opération, y compris les boutons radio. L’historique reste uniquement en mémoire dans le contexte isolé de la page ; un rechargement ou une navigation l’efface. Un second clic sans changement conserve l’annulation précédente.

`Alt+Maj+F` utilise le profil associé au domaine, sinon le profil actif (initialement celui par défaut). Les sous-domaines sont inclus. Le choix dans le popup remplace cette proposition pour l’action en cours. Le raccourci se modifie dans `chrome://extensions/shortcuts`. Sur HTTP, le raccourci ne remplit rien : ouvrir le popup et accepter l’avertissement. Ouvrir le popup seul ne remplit jamais la page.

Les options permettent de créer, renommer, dupliquer, supprimer et définir un profil par défaut. Les profils s’enregistrent explicitement ; les préférences s’enregistrent immédiatement. Éviter les modifications concurrentes dans plusieurs onglets d’options.

Les mots-clés personnalisés sont séparés par des virgules. « Contient » recherche dans chaque source normalisée ; « Exacte » exige l’égalité de la source complète. Ces règles sont prioritaires, sans contourner les exclusions de sécurité. Les dates sont stockées en `AAAA-MM-JJ` ; les champs texte acceptent les indications JJ/MM/AAAA, DD/MM/YYYY, MM/DD/YYYY et YYYY-MM-DD. Les synonymes de pays sont dans `src/engine/synonyms.ts`. Les choix ambigus sont ignorés.

## Sauvegarde

L’export contient les profils **enregistrés** et préférences dans un JSON non chiffré. Le conserver en lieu sûr. L’import valide les fichiers version 1 de moins de 2 Mo et présente les noms et nombres de champs avant toute écriture. **Fusionner** ajoute des copies indépendantes avec de nouveaux identifiants en conservant les préférences actuelles. **Tout remplacer** remplace profils et préférences. Annuler l’aperçu ne modifie rien. Limites : 100 profils, 100 règles par profil, au moins un profil conservé.

## Limites et confidentialité

- Aucun serveur, compte, suivi, synchronisation ou appel réseau de l’extension. Remplir communique néanmoins les données choisies au site, dont les scripts peuvent les transmettre avant toute soumission.
- Ne jamais enregistrer de mots de passe, coordonnées bancaires ou secrets. Profils et sauvegardes non chiffrés.
- Exclusion des identifiants, mots de passe, cartes, IBAN, codes temporaires, cases à cocher et champs invisibles, désactivés ou en lecture seule.
- Seuls les champs intersectant la fenêtre visible sont remplis. Faire défiler les formulaires longs puis relancer. Chaque remplissage effectif remplace la transaction d’annulation précédente.
- Shadow DOM ouverts et iframes accessibles de même origine parcourus. Racines fermées et iframes d’autre origine ignorées sans bloquer le formulaire principal.
- Les sites restent maîtres de leur validation. Aucun événement synthétique ne peut être marqué « trusted ». Le remplacement des nœuds par un framework peut empêcher leur annulation.
- Pages du navigateur, boutiques d’extensions et autres pages protégées : injection parfois impossible. Aucune soumission automatique.
- Interface FR/EN selon le navigateur, thème selon le système. Firefox, Safari, chiffrement, menu contextuel et publication différés.

## Vérifications et archive

`npm run check`, `npx playwright install chromium`, `npm run test:e2e`, `npm run format:check`. Les véritables React, Vue et Angular sont des dépendances de test uniquement. Aucune dépendance d’exécution dans l’extension.

`npm run package` produit `fieldhand-1.0.0.zip` via PowerShell. Sur un autre système, compresser le **contenu** de `dist`, avec le manifeste à la racine. Icônes PNG : 16, 32, 48 et 128 pixels. Relire les résultats de vérification, la politique et le nom avant une publication. Aucune publication effectuée.

Le schéma version 1 est validé à l’écriture. Migration du format documenté `{ version: 0, profile: { firstName: "…", email: "…" } }` : champs manquants complétés et identifiants créés. Les versions inconnues sont refusées sans effacer les données. Le prototype absent ne permet pas de garantir d’autres migrations.
