# Promille

Mobilvennlig webapp for å logge drikke og følge promillen gjennom kvelden.

- Logg inn med navn og 4-sifret PIN – vekt og kjønn brukes i utregningen
- Over 60 drikker med illustrasjoner (øl, cider, vin, sprit, drinker) + egendefinert mengde og styrke
- Graf med estimert promille hittil og fremover, tidspunkt for 0,2 ‰ og edru
- Felles database (Supabase) med sanntid: se promillen til vennene dine under «Venner»

Promillen beregnes med Widmarks formel, lineært opptak over 45 minutter og forbrenning på 0,15 ‰ i timen. Tallene er estimater.

```sh
npm install
npm run dev
```

Databaseskjemaet ligger i `supabase/migrations/` (kjøres i rekkefølge i Supabase SQL Editor), og offentlig URL/nøkkel i `.env`.

Deployes automatisk til GitHub Pages ved push til `main`.
