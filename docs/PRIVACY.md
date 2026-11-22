# Fieldhand privacy policy / Politique de confidentialité

Effective date / Date d’effet: 13 November 2026 / 13 novembre 2026.

## English

Fieldhand stores profile names, personal details, custom rules, domain preferences and settings exclusively in `chrome.storage.local` on your device. It does not use accounts, cloud synchronization, analytics, advertising, remote code, network APIs or external services. The developer receives no profile information or usage data through the extension.

Only your explicit toolbar-button or shortcut action fills a page. Opening the popup may inspect page status but never fills. The extension uses temporary `activeTab` access and on-demand script injection. It never submits forms. **When you fill a form, the selected details become available to that website. The website may immediately transmit them using its own scripts; its privacy policy applies.** Undo cannot retract data a website has already read or transmitted.

Profiles are not encrypted. Avoid passwords, payment details and secrets. Only trusted extension contexts may read the local profile store. Temporary undo records hold previous control values in the page’s isolated extension context until replaced, undone, or the document is unloaded. Diagnostic console output contains only field indices and matching/skipping reasons, never field values or label text.

JSON export deliberately downloads an unencrypted copy of saved profiles and preferences. Import is processed on your device and requires a validated preview followed by merge or replace. The extension does not send those files elsewhere.

Delete profiles using the options page (one empty profile must remain), or clear extension data/remove the extension to remove its local storage. Uninstalling does not delete JSON backups you downloaded. You control those separately. Browser/OS administrators, backups, website policies and other software are outside the extension’s control.

This repository provides the policy for local use. A publisher must supply their identity and support contact in the store listing before distribution.

## Français

Fieldhand conserve les profils, coordonnées, règles, domaines et préférences uniquement dans `chrome.storage.local` sur votre appareil. Aucun compte, synchronisation cloud, suivi, publicité, code distant ou service externe. Le développeur ne reçoit aucune donnée personnelle ni statistique via l’extension.

Le remplissage exige votre clic ou raccourci. Le popup peut consulter l’état de la page sans la remplir. L’accès `activeTab` est temporaire ; le script est injecté à la demande. Aucune soumission automatique. **Les coordonnées remplies deviennent accessibles au site, qui peut les transmettre immédiatement via ses scripts. Sa politique s’applique.** L’annulation ne retire pas les données déjà lues ou envoyées par le site.

Profils et exports JSON non chiffrés : ne pas y enregistrer de mots de passe, données bancaires ou secrets. Le stockage est réservé aux contextes de confiance de l’extension. Les anciennes valeurs restent temporairement dans la mémoire isolée de la page pour l’annulation, jusqu’au remplacement, à l’annulation ou au déchargement du document. Le diagnostic journalise uniquement des indices et raisons, jamais les valeurs ni les libellés.

L’import et son aperçu sont traités localement. Supprimer les profils dans les options (conserver un profil vide), effacer les données de l’extension ou la désinstaller pour retirer son stockage. Les fichiers JSON téléchargés restent à supprimer séparément. Les politiques du site, du navigateur, du système et les sauvegardes externes ne relèvent pas de Fieldhand.

Avant distribution, l’éditeur doit fournir son identité et un contact d’assistance dans la fiche de publication.
