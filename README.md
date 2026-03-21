# PourOverFlow

PourOverFlow to planowana aplikacja Zepp OS do prowadzenia uzytkownika przez reczne parzenie kawy na zegarku. V1 ma laczyc prosty watch-first flow wykonawczy z telefonicznym managerem receptur i historii.

## Aktualny status

Repo jest obecnie na etapie dokumentacji i zamrozenia decyzji architektonicznych. Nie ma jeszcze scaffoldu Zepp app ani kodu runtime. Pierwsze commity repo zawieraja wylacznie dokumenty wdrozeniowe i onboardingowe dla v1.

## Co ma zrobic produkt

- Na zegarku: `tool -> recipe -> active brew`
- W trakcie sesji: timer kroku, timer calej sesji, kroki reczne typu `Next`, feedback haptyczny i opcjonalnie audio
- Po stronie telefonu: pelny CRUD receptur i historii
- Synchronizacja: `setting/ -> app-side/ -> messaging.peerSocket -> Device App`
- Resume: best-effort `resume`, a nie gwarantowany pelny background engine

## Twarde zalozenia v1

- `configVersion: "v3"`
- `runtime.apiVersion.target: "4.0"`
- profil `v4`
- scope ekranow: `round + square`
- brak `band`
- zamkniety katalog wspieranych narzedzi
- telefon jest zrodlem prawdy dla receptur i historii
- zegarek przechowuje tylko cache, aktywna sesje, ostatni wynik i metadane sync

## Najwazniejsze dokumenty

- [Start Here](c:\Users\krzys\Projects\PourOverFlow\docs\START-HERE.md)
- [Product Goals](c:\Users\krzys\Projects\PourOverFlow\docs\00-product-goals.md)
- [Zepp Architecture](c:\Users\krzys\Projects\PourOverFlow\docs\01-zepp-architecture.md)
- [Domain Model](c:\Users\krzys\Projects\PourOverFlow\docs\02-domain-model.md)
- [Sync and Storage](c:\Users\krzys\Projects\PourOverFlow\docs\03-sync-and-storage.md)
- [Watch and Phone Flows](c:\Users\krzys\Projects\PourOverFlow\docs\04-watch-and-phone-flows.md)
- [Seed Library](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md)
- [Manifest and UI Contract](c:\Users\krzys\Projects\PourOverFlow\docs\06-manifest-and-ui-contract.md)
- [Implementation TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md)
- [Agent Instructions](c:\Users\krzys\Projects\PourOverFlow\AGENTS.md)

## Kolejnosc pracy

1. Przeczytac [Start Here](c:\Users\krzys\Projects\PourOverFlow\docs\START-HERE.md).
2. Zamrozic scaffold zgodnie z [Zepp Architecture](c:\Users\krzys\Projects\PourOverFlow\docs\01-zepp-architecture.md).
3. Trzymac sie modelu danych z [Domain Model](c:\Users\krzys\Projects\PourOverFlow\docs\02-domain-model.md).
4. Seedowac biblioteke zgodnie z [Seed Library](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md).
5. Trzymac sie kontraktu `app.json` i `setting/` z [Manifest and UI Contract](c:\Users\krzys\Projects\PourOverFlow\docs\06-manifest-and-ui-contract.md).
6. Nie zmieniac kontraktow storage i sync bez aktualizacji dokumentow.
7. Realizowac etapy z [TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) w kolejnosci.

## Zakres etapu nastepnego

Nastepny praktyczny etap to Etap 2 z [TODO](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md): scaffold Zepp app z `app.json`, `app.js`, stronami watch, `setting/`, `app-side/` i wspoldzielonymi modulami.

## Czego nie ma jeszcze w repo

- `app.json`
- `app.js`
- `package.json`
- assets
- watch pages
- `setting/`
- `app-side/`
- implementacji engine'u receptur

## Wazne ograniczenia techniczne

- Nie traktowac `AppService` jako rdzenia timera.
- Nie dodawac cloud sync, backendu, importu zewnetrznych receptur ani BLE do baseline v1.
- Nie projektowac user-defined `Tool`.
- Nie przenosic kanonicznej historii na zegarek.

## Commit history

- `38bcd5e` - `Add PourOverFlow v1 architecture and planning docs`
- `0f7313d` - `Add agent onboarding and backlog maintenance docs`

To jest punkt startowy dla dalszej implementacji.
