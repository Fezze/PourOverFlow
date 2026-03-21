# AGENTS.md

## Cel tego pliku

Ten plik jest instrukcja repo-level dla kolejnego agenta AI. Traktuj go jako warstwe nadrzedna wobec domyslnych zalozen o projekcie, ale podrzedna wobec jawnych polecen usera.

## Stan repo

- Repo ma zakonczony Etap 2.
- Istnieje scaffold Zepp app i przechodzacy `zeus build`.
- Aktualny zakres prac to Etap 3: phone storage, seed recipes i prawdziwy CRUD w `setting/`.
- To repo jest projektem Zepp OS, wiec przy kazdym zadaniu dotyczacym implementacji, architektury, debugowania albo walidacji nalezy uzyc skilla `zepp-miniapp-builder` jako podstawowego workflow.

## Obowiazkowa kolejnosc czytania

Przed jakakolwiek implementacja przeczytaj w tej kolejnosci:

1. [README.md](c:\Users\krzys\Projects\PourOverFlow\README.md)
2. [docs/START-HERE.md](c:\Users\krzys\Projects\PourOverFlow\docs\START-HERE.md)
3. [docs/01-zepp-architecture.md](c:\Users\krzys\Projects\PourOverFlow\docs\01-zepp-architecture.md)
4. [docs/02-domain-model.md](c:\Users\krzys\Projects\PourOverFlow\docs\02-domain-model.md)
5. [docs/03-sync-and-storage.md](c:\Users\krzys\Projects\PourOverFlow\docs\03-sync-and-storage.md)
6. [docs/04-watch-and-phone-flows.md](c:\Users\krzys\Projects\PourOverFlow\docs\04-watch-and-phone-flows.md)
7. [docs/05-seed-library.md](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md)
8. [docs/06-manifest-and-ui-contract.md](c:\Users\krzys\Projects\PourOverFlow\docs\06-manifest-and-ui-contract.md)
9. [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md)

Nie zaczynaj pisac kodu "z glowy", jesli nie przeczytales tych plikow.

## Obowiazkowy skill

To repo dotyczy Zepp OS mini-app, dlatego agent ma zawsze:

- uruchomic prace z zalozeniem uzycia skilla `zepp-miniapp-builder`,
- sprawdzac decyzje runtime, manifestu, surface architecture i permissionow przez pryzmat tego skilla,
- nie traktowac tego projektu jak zwyklego web app albo generycznego mobile app.

Jesli zadanie dotyczy Zepp runtime i agent nie uzywa `zepp-miniapp-builder`, to znaczy, ze workflow jest niezgodny z zalozeniami repo.

## Decyzje zamrozone

- Target runtime to `API 4.0`.
- Scope ekranow to `round + square`.
- `band` poza v1.
- Katalog `Tool` jest zamkniety i read-only.
- Telefon jest zrodlem prawdy dla receptur i historii.
- Zegarek trzyma tylko cache, aktywna sesje, ostatni wynik i metadane sync.
- Watch browse flow to zawsze `tool -> recipe -> active brew`.
- Aktywna sesja pracuje na `RecipeSnapshot`.
- Usuniecie receptury nie usuwa historii.
- `PUSH_HISTORY_SNAPSHOT` synchronizuje tylko ostatni wynik, nie pelne archiwum.
- `AppService` jest tylko spike badawczym, nie baseline v1.

## Czego nie wolno zmieniac bez jawnej decyzji

- Nazw kluczy storage.
- Nazw typow wiadomosci sync.
- Katalogu wspieranych `toolId` bez aktualizacji dokumentacji produktu i modelu danych.
- Zasady "phone is source of truth".
- Zakresu v1 poprzez dodanie cloud, backendu, importu zewnetrznego albo BLE.

## Jak implementowac

- Buduj zgodnie z etapami z [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md).
- Najpierw scaffold i kontrakty, potem UI i engine, potem resume i sync hardening.
- Trzymaj logike domenowa w wspoldzielonych modulach testowalnych bez runtime Zepp.
- Warstwa watch UI ma byc cienka: czyta stan i renderuje.
- Warstwa `setting/` ma byc jedynym miejscem CRUD receptur i historii.
- Warstwa `app-side/` ma byc jedynym mostem sync do zegarka.

## Obowiazkowa higiena backlogu i dokumentacji

Kazdy agent pracujacy w tym repo ma obowiazek utrzymywac backlog i dokumentacje w stanie uzywalnym dla kolejnego agenta.

### Przy starcie kazdej sesji

- Przejrzyj [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) i ostatnio zmieniane dokumenty.
- Zidentyfikuj najblizszy sensowny krok implementacyjny.
- Zasugeruj userowi, czym najlepiej zajac sie nastepnie, zamiast startowac od przypadkowego zadania.
- Jesli znajdziesz przeterminowane, wykonane albo nieaktualne punkty, najpierw uporzadkuj backlog.

### W trakcie pracy

- Kazda nowa rzecz do zrobienia, ryzyko, spike, debt albo odkryte ograniczenie ma trafic do [docs/TODO.md](c:\Users\krzys\Projects\PourOverFlow\docs\TODO.md) albo do bardziej odpowiedniego dokumentu, jesli dotyczy stalej decyzji architektonicznej.
- Nie zostawiaj waznych ustalen tylko w odpowiedzi czatu albo w swojej glowie.
- Jesli implementacja zmienia model danych, kontrakty sync, flow albo scope, zaktualizuj odpowiedni dokument od razu, nie "pozniej".

### Przy zamykaniu zadania

- Usun lub oznacz jako wykonane punkty TODO, ktore zostaly zrealizowane.
- Dopisz nowe follow-upy wynikajace z wykonanej pracy.
- Oczysc TODO z punktow nieaktualnych, zdublowanych albo juz niepotrzebnych.
- Upewnij sie, ze `README.md`, `docs/START-HERE.md` i `docs/TODO.md` nadal prowadza kolejnego agenta do sensownego nastepnego kroku.

### Twarda regula

Nowy agent startujacy prace w tym repo ma zawsze:

1. przejrzec backlog i dokumentacje,
2. ocenic, co jest aktualnie najlepszym nastepnym krokiem,
3. zakomunikowac te sugestie userowi,
4. dopiero potem implementowac.

## Jak testowac

Minimalny standard:

- testy czystej logiki dla modelu, reducera sesji i sync,
- simulator dla layoutu i flow,
- real device dla haptyki, audio, wygaszania ekranu i resume.

Nie traktuj simulatora jako dowodu poprawnosci feedbacku lub zachowania przy wygaszonym ekranie.

## Co zrobic jako pierwsze

Pierwsze zadanie implementacyjne po obecnym stanie repo to Etap 3:

- zaimplementowac pelne rekordy `RecipeRecord` i `HistoryEntry`,
- zseedowac recipe library zgodnie z `docs/05-seed-library.md`,
- rozwinac `setting/` z placeholderowego scaffoldu do realnego CRUD,
- utrzymac `zeus build` w stanie zielonym po kazdej wiekszej zmianie.

## Odkryte niuanse toolchainu

- Dla target-based scaffoldu `configVersion: "v3"` Zeus oczekuje ikon rowniez pod `assets/<target>.<shape>/icon.png`, nie tylko logicznej nazwy `icon.png` w `app.json`.
- Entry `setting.path` jest najbezpieczniej wystawiac przez `setting/index.js`; jesli zrodlo jest w `.jsx`, zostaw cienki shim JS zamiast polegac wylacznie na bezposrednim `index.jsx`.
- Obecny scaffold watch runtime trzyma stan tylko w pamieci aplikacji. To jest swiadomy etapowy kompromis Etapu 2, nie docelowa implementacja `LocalStorage`.

## Kiedy aktualizowac dokumenty

Aktualizuj dokumenty zawsze, gdy zmienia sie:

- model danych,
- kontrakty sync,
- katalog wspieranych narzedzi,
- przeplyw watch/phone,
- decyzje scope v1.

Jesli implementacja odkryje ograniczenie techniczne Zeppa, zaktualizuj odpowiedni dokument przed zamknieciem zadania.

Dotyczy to rowniez TODO hygiene:

- zamykaj wykonane punkty,
- dopisuj nowe odkryte zadania,
- nie pozwalaj, by `docs/TODO.md` stalo sie archiwum nieaktualnych notatek.
