Pack d'icônes - version 'top' optimisée

Améliorations appliquées :
- Icône vectorielle propre (app-icon.svg) avec house + 3 bars (bar chart).
- PNGs rendus en haute qualité depuis primitives (rounded background + transparent variants).
- Maskable icon produit avec zone sûre (80% content) pour Android adaptive icon cropping.
- Favicon multi-res (ICO 16/32/48) et PNG 32 fourni.
- Apple touch icon (180x180) fournie.
- Transparent variants (icon-*x*-transparent.png) utiles pour toolbars / contexts with custom backgrounds.

Conseils d'intégration :
1) Copier les fichiers à la racine de /public (ou dans /public/icons selon ton organisation).
2) Copier le contenu de index-head-snippet.html dans la balise <head> de public/index.html.
3) Vérifier manifest.json et ajuster les chemins si tu veux garder les icônes dans /icons/.
4) Pour une intégration Android optimale, utilise maskable_icon.png comme "purpose: maskable" dans manifest (déjà présent).
5) Teste sur Chrome DevTools > Application > Manifest, et sur appareil réel pour vérifier splash + icon adaptative.

Si tu veux :
- que je mette toutes les icônes dans un sous-dossier /icons et mette à jour manifest + html, je peux le faire.
- ou que je génère un zip téléchargeable prêt à déployer, je prépare le zip et le lien.
