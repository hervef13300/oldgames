# Provenance et composants tiers

- apple2js : https://github.com/whscullin/apple2js — révision `ee0aed25f73c69d0245e86a2a5fccb3324c3056c` ; licence MIT conservée dans games/castle-wolfenstein/vendor/apple2js/LICENSE.
- cpu6502 : https://github.com/whscullin/cpu6502 — révision `dca469ab95e38a3fa1a63e95be2f65aa155dc86d` ; licence MIT conservée dans games/castle-wolfenstein/vendor/cpu6502/LICENSE.
- Adaptations locales : imports statiques des ROM Apple II+, Canvas2D, désactivation du worker de conversion de disquette, restauration de RAM en conservant les vues mémoire vidéo, suppression de la lecture des manettes pour le mode web au clavier (compatible avec les restrictions des pages intégrées). Le dossier games/castle-wolfenstein/vendor conserve aussi des fichiers amont inutilisés ; seuls les modules nécessaires sont embarqués par esbuild.
- Les ROM système et caractères sont issues du dépôt apple2js. La licence du code de l'émulateur n'est pas une déclaration de cession des droits sur les logiciels et données historiques émulés.
- Castle Wolfenstein : Muse Software, Silas Warner, copyright 1981. Image de référence `castle_wolfenstein-fixed.dsk`, téléchargée depuis le miroir de préservation Asimov ; empreinte et URL dans games/castle-wolfenstein/disk-provenance.json. Variante corrigée, non certifiée identique à un master commercial d'origine. La disponibilité sur une archive ne constitue pas une déclaration de domaine public.
- Le code d'intégration propre à ce dépôt est fourni pour ce projet privé. Aucun droit sur le jeu historique ou sa marque n'est revendiqué.

## Choplifter

Source : dépôt privé de l’utilisateur https://github.com/hervef13300/choplifter, commit f4616c47e4eadc4e6c85638710bc2bb6c384f9f0 (Android 0.4). Portage et intégration à Oldgames demandés par son propriétaire. Simulation et rendu adaptés en JavaScript ; sept sons WAV du projet conservés sans modification. Le dépôt décrit ses graphismes et sons comme des créations originales du projet. Les références Java et le document de fidélité sont inclus dans games/choplifter/source-references. Aucun statut de domaine public ni licence tiers sur ces sources n’est présumé.


## Zany Golf web recreation

`zanygolf/` contains newly written JavaScript, original 3D models, original course layouts and synthesized sound effects, inspired by the game published by Electronic Arts in 1988. It includes no original game disk, extracted sprites or historical music. It does not claim exact fidelity or official affiliation. Historical reference: https://archive.org/details/a2gs_Zany_golf_1988_Electronic_Arts.

The UI requests DM Sans and Space Grotesk through Google Fonts, with local system-font fallbacks.


### Three.js

Zany Golf uses Three.js 0.170.0 (MIT), bundled locally at build time. Source: https://github.com/mrdoob/three. The published license is `/zanygolf/LICENSE-three.txt`. The catalogue preview is an offline Blender render of the game models, not a browser screenshot.
