# Référence historique et versions Android

Référence : **Choplifter, Apple II, Dan Gorlin / Broderbund, 1982**.

Manuel original consulté le 13 novembre 2026 : [scan sur Internet Archive](https://archive.org/details/adoc_choplifter), [PDF](https://archive.org/download/adoc_choplifter/choplifter.pdf). L’OCR a servi à la lecture ; aucune image ni aucun son du manuel ou du jeu n’est incorporé dans l’application.

Le manuel confirme : quatre casernes de seize personnes ; première caserne déjà ouverte ; groupe précédent à sauver ou perdre avant le suivant ; seize passagers maximum ; trois hélicoptères ; fin à la perte du troisième appareil ou lorsque toutes les personnes sont sauvées ou mortes ; orientation indépendante, face pour attaquer les chars ; avions à missiles et mines aériennes poursuivant le joueur ; les mines peuvent franchir la limite de la base, contrairement aux autres ennemis.

## 0.2 — Pilotage et sauvetage

- Orientation gauche / face / droite indépendante du joystick.
- Tirs horizontaux latéraux, tir descendant de face ; fin du couple tir + bombe automatique.
- Inertie, inclinaison et stabilisation avant embarquement ; progression par caserne.
- Première caserne ouverte, capacité 16, débarquement progressif, comptage de la population finie.
- Trois appareils, animation de destruction et réapparition à la base.
- Mode Classique : un impact détruit l’appareil. Mode Assisté : jauge de coque et réparation à la base.

## Limites de fidélité

Le jeu est une adaptation Android, pas une émulation. Les vitesses, distances et horaires d’apparition sont réglés pour cette adaptation et n’ont pas été mesurés image par image sur l’Apple II. Les trois boutons d’orientation remplacent les pressions courtes et longues du joystick d’époque. Le mode Assisté, la mini-carte et les indications d’atterrissage sont des aides contemporaines. Le choix d’un impact fatal en Classique est une règle d’adaptation ; le manuel décrit la destruction et le nombre de vies sans détailler chaque collision.

## 0.3 — Menaces et progression

- Chars en patrouille : tirs au niveau du sol pouvant tuer les otages.
- Avions destructibles : traversées, missiles visant la trajectoire et bombes contre un appareil posé.
- Mines aériennes destructibles poursuivant l’hélicoptère, y compris dans la zone de base.
- Alertes avant apparition ; fréquences d’arrivée croissantes après les rotations réussies ; nombre et durée de vie des ennemis bornés.
- L’attaque au sol par bombes est aussi décrite dans l’article Wikipédia fourni ; elle complète les missiles du manuel. Les horaires et trajectoires restent ceux de cette adaptation.

## 0.4 — Présentation et finition Android

- Sprites dessinés pour le projet, palette limitée à dominante noir / vert / violet / orange, rendu au pixel et police monospace.
- Trois silhouettes d’hélicoptère, rotor animé, personnages qui marchent et saluent, casernes ouvertes et animation de destruction.
- Compteurs morts / à bord / sauvés, appareils restants, mini-carte et alertes de menaces.
- Sept sons PCM synthétisés par `tools/generate_audio.py` : rotor en boucle, tir, ouverture, embarquement, débarquement, explosion et fin de mission. Ce ne sont pas des sons extraits de l’original.
- Commandes multitouch avec maintien simultané du joystick et du tir ; orientation sélectionnée séparément.
- Correction de la pause par Retour Android : la reprise relance correctement la boucle ; suspension des sons en arrière-plan et bouton de son avec réglage persistant.
- Test instrumenté sur le runtime Android, captures de la vue réelle et APK installable.

La vue de face produit un projectile vertical dans notre plan 2D, une traduction de la posture « tank attack » du manuel. Les collisions avec les toits et la sanction d’une descente trop rapide sont des choix de jouabilité de l’adaptation. Les performances et le confort tactile sur téléphone physique restent à vérifier. La fidélité visuelle est une interprétation originale de la palette et des silhouettes d’époque, pas une copie des sprites historiques.
