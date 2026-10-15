# Promille

Mobilvennlig webapp for å logge drikke og følge promillen gjennom kvelden.

- Logg inn med kun navn – vekt og kjønn brukes i utregningen
- Over 60 drikker med illustrasjoner (øl, cider, vin, sprit, drinker) + egendefinert mengde og styrke
- Graf med estimert promille hittil og fremover, tidspunkt for 0,2 ‰ og edru
- Data lagres lokalt i nettleseren

Promillen beregnes med Widmarks formel, lineært opptak over 45 minutter og forbrenning på 0,15 ‰ i timen. Tallene er estimater.

```sh
npm install
npm run dev
```

Deployes automatisk til GitHub Pages ved push til `main`.
