# Provenance et composants tiers

- apple2js : https://github.com/whscullin/apple2js — révision `ee0aed25f73c69d0245e86a2a5fccb3324c3056c` ; licence MIT conservée dans vendor/apple2js/LICENSE.
- cpu6502 : https://github.com/whscullin/cpu6502 — révision `dca469ab95e38a3fa1a63e95be2f65aa155dc86d` ; licence MIT conservée dans vendor/cpu6502/LICENSE.
- Adaptations locales : imports statiques des ROM Apple II+, Canvas2D, désactivation du worker de conversion de disquette, restauration de RAM en conservant les vues mémoire vidéo. Le dossier vendor conserve aussi des fichiers amont inutilisés ; seuls les modules nécessaires sont embarqués par esbuild.
- Les ROM système et caractères sont issues du dépôt apple2js. La licence du code de l'émulateur n'est pas une déclaration de cession des droits sur les logiciels et données historiques émulés.
- Castle Wolfenstein : Muse Software, Silas Warner, copyright 1981. Image de référence `castle_wolfenstein-fixed.dsk`, téléchargée depuis le miroir de préservation Asimov ; empreinte et URL dans docs/disk-provenance.json. Variante corrigée, non certifiée identique à un master commercial d'origine. La disponibilité sur une archive ne constitue pas une déclaration de domaine public.
- Le code d'intégration propre à ce dépôt est fourni pour ce projet privé. Aucun droit sur le jeu historique ou sa marque n'est revendiqué.

## Choplifter

Source : dépôt privé de l’utilisateur https://github.com/hervef13300/choplifter, commit f4616c47e4eadc4e6c85638710bc2bb6c384f9f0 (Android 0.4). Portage et intégration à Oldgames demandés par son propriétaire. Simulation et rendu adaptés en JavaScript ; sept sons WAV du projet conservés sans modification. Le dépôt décrit ses graphismes et sons comme des créations originales du projet. Les références Java et le document de fidélité sont inclus dans source-references/choplifter. Aucun statut de domaine public ni licence tiers sur ces sources n’est présumé.
