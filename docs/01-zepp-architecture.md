# PourOverFlow v1 - architektura Zepp

## Profil runtime

Projekt ma zostac zbudowany jako nowoczesna mini-app Zepp:

- `configVersion: "v3"`
- `runtime.apiVersion.target: "4.0"`
- profil kompatybilnosci: `v4`
- tylko `round + square`
- `band` poza zakresem

Kod ma uzywac `@zos/*`, nie legacy `hmUI` lub `hmApp`.

## Zalozenia architektoniczne

- v1 ma opierac sie na oficjalnych API Zeppa bez dodatkowych wrapperow typu `@zeppos/zml`,
- `setting/` odpowiada za UI do zarzadzania danymi,
- `app-side/` odpowiada za synchronizacje i normalizacje danych,
- `page/` odpowiada za watch UX,
- `app-service/` nie jest czescia baseline v1 i pojawia sie dopiero jako osobny spike badawczy.

## Proponowana struktura repo

Ta struktura ma byc potraktowana jako docelowy scaffold:

```text
app.js
app.json
package.json
assets/
  common.r/
  common.s/
page/
  home/
    index.js
    index.r.layout.js
    index.s.layout.js
  tool-list/
    index.js
    index.r.layout.js
    index.s.layout.js
  recipe-list/
    index.js
    index.r.layout.js
    index.s.layout.js
  brew-active/
    index.js
    index.r.layout.js
    index.s.layout.js
  result-summary/
    index.js
    index.r.layout.js
    index.s.layout.js
setting/
  index.jsx
app-side/
  index.js
shared/
  constants/
    tool-catalog.js
    color-palette.js
  domain/
    schema.js
    validators.js
  storage/
    keys.js
    phone-store.js
    watch-store.js
  sync/
    message-types.js
    encode.js
    decode.js
    normalize.js
  engine/
    recipe-engine.js
    session-reducer.js
    feedback.js
  watch/
    router.js
    layouts.js
```

## Surface responsibilities

### `app.js`

- rejestruje `App()` dokladnie raz,
- trzyma minimalne `globalData`,
- nie przechowuje duzych danych katalogowych,
- moze trzymac tylko ulotne flagi bootstrapa.

### `page/home/index.js`

- pierwszy punkt wejscia watch app,
- laduje `active_session_v1`, `catalog_cache_v1` i `sync_meta_v1`,
- decyduje, czy pokazac resume, czy przejsc do `tool-list`,
- odpala `REQUEST_BOOTSTRAP`, ale nie blokuje UI na odpowiedz.

### `page/tool-list/index.js`

- pokazuje zamkniety katalog wspieranych narzedzi,
- nie wyswietla receptur bezposrednio,
- sluzy jako pierwszy ekran browse flow.

### `page/recipe-list/index.js`

- pokazuje receptury tylko dla jednego `toolId`,
- sortuje po `updatedAt desc`, a potem po `name asc`,
- nie pokazuje pelnej historii ani edytora.

### `page/brew-active/index.js`

- renderuje aktywna sesje,
- pokazuje jednoczesnie timer kroku, timer calej sesji i kluczowe metadata kroku,
- uzywa `setPageBrightTime(...)` oraz `setWakeUpRelaunch(true)` przez caly czas aktywnego parzenia,
- zapisuje sesje do `active_session_v1` po kazdej zmianie krytycznego stanu.

### `page/result-summary/index.js`

- pokazuje skrot wyniku tuz po zakonczeniu sesji,
- nie probuje zbierac dlugich notatek tekstowych,
- zapisuje `last_result_v1`.

### `setting/index.jsx`

- rejestruje `AppSettingsPage(...)`,
- jest jedynym miejscem CRUD dla receptur i historii,
- korzysta z `props.settingsStorage`,
- trzyma routing widokow tylko w stanie UI, nie w persisted storage.

### `app-side/index.js`

- seeduje katalog narzedzi przy pierwszym uruchomieniu,
- obserwuje `settingsStorage`,
- normalizuje snapshoty danych,
- nasluchuje `messaging.peerSocket`,
- odpowiada na `REQUEST_BOOTSTRAP`,
- wysyla `PUSH_TOOL_CATALOG`, `PUSH_CATALOG_SNAPSHOT` i `PUSH_HISTORY_SNAPSHOT`,
- przyjmuje `UPSERT_HISTORY_ENTRY` z zegarka i zapisuje historie po stronie telefonu.

## Watch pages i routing

Flow watch UI ma byc prosty i stabilny:

1. `home`
2. `tool-list`
3. `recipe-list`
4. `brew-active`
5. `result-summary`

Nie dodawac osobnych stron dla:

- ustawien na zegarku,
- pelnej historii,
- tworzenia lub edycji receptur.

## Phone views w `setting/`

W `setting/index.jsx` nalezy przewidziec nastepujace widoki logiczne:

- `library-home`
- `recipe-list`
- `recipe-editor`
- `history-list`
- `history-detail`
- `about-sync`

Routing tych widokow ma byc lokalny dla `setting/`. Nie zapisujemy aktywnego widoku do `settingsStorage`.

## Screen adaptation

Projekt ma korzystac z mechanizmu `app.json v3+` i layout files:

- `index.r.layout.js` dla round,
- `index.s.layout.js` dla square,
- `zosLoader:./index.[pf].layout.js` do wyboru layoutu,
- `assets/common.r` i `assets/common.s` dla zasobow.

### Decyzja o `designWidth`

Na starcie nie ustawiac recznie `designWidth`, zeby skorzystac z domyslnych benchmarkow Zeppa dla round i square. Po zbudowaniu pierwszych ekranow mozna to zweryfikowac na podstawie realnych assetow, ale baseline dokumentacyjny ma byc neutralny i korzystac z `px(...)` tam, gdzie wartosci pochodza z draftu.

## Manifest i targety

W `app.json` kolejny agent ma zamrozic co najmniej:

- `configVersion: "v3"`,
- `runtime.apiVersion.target: "4.0"`,
- target `common`,
- platformy `round` i `square`,
- rejestracje wszystkich stron `page/*`,
- wlaczenie `setting/` i `app-side/`.

Manifest ma zawierac `device:os.local_storage` w baseline.

Nie dodawac na starcie:

- `device:os.bg_service`,
- `data-widget`,
- `secondary-widget`,
- BLE permissions.

`device:os.bg_service` jest dozwolone dopiero w fazie spike dla background reminders.

## Permissions i capability posture

### Baseline

- `device:os.local_storage` - wymagane

### Best-effort feedback

- haptyka przez `Vibrator` jest priorytetem,
- audio przez `SystemSounds` lub `Buzzer` tylko po capability check i z uwzglednieniem trybow systemowych.

### Explicitly out for baseline

- BLE,
- geolocation,
- app-service background permission.

## Wspoldzielone moduly

### `shared/constants/tool-catalog.js`

- zawiera seed katalogu narzedzi,
- jest jedynym zrodlem definicji `toolId`,
- sluzy do pierwszego seedowania `pof_tools_v1`.

### `shared/domain/*`

- przechowuje schematy i walidatory rekordow,
- jest wspolne dla `setting/`, `app-side/` i watch app.

### `shared/storage/*`

- kapsulkuje klucze i funkcje `read/write`,
- izoluje format JSON od warstw UI.

### `shared/sync/*`

- zamraza typy wiadomosci,
- koduje JSON do `ArrayBuffer`,
- dekoduje `ArrayBuffer` do JSON,
- waliduje `schemaVersion`.

### `shared/engine/*`

- implementuje czysta logike sesji,
- ma byc testowalny bez runtime Zepp,
- nie powinien bezposrednio importowac widgetow UI.

## Architektura danych w runtime

### Telefon jest zrodlem prawdy

Telefon trzyma:

- katalog narzedzi,
- indeks receptur,
- pelne rekordy receptur,
- indeks historii,
- pelne rekordy historii,
- rewizje synchronizacji.

### Zegarek trzyma stan operacyjny

Zegarek trzyma:

- cache katalogu do szybkiego startu,
- aktywna sesje,
- ostatni wynik,
- metadane sync wraz z kolejka niezsynchronizowanych wynikow.

## Resume i tlo

### Required baseline

- `page/brew-active` ma zapisywac sesje po kazdej zmianie kroku,
- `setWakeUpRelaunch(true)` ma byc wlaczone dla aktywnej strony,
- `setPageBrightTime(...)` ma byc uzywane dla aktywnego parzenia.

### Forbidden assumption

Nie wolno projektowac v1 tak, jakby `AppService` byl gwarantowanym zegarem sesji. `AppService` nie ma UI, ma ograniczenia wykonania i nie obsluguje zwyklego `setTimeout`.

## Narzedzia debugowania

W dokumentach implementacyjnych zakladamy:

- `zeus build` jako minimalna bramka kompilacji,
- simulator dla layoutu i flow,
- real device dla haptyki, audio i zachowania po wygaszeniu ekranu.

Jesli pojawi sie problem z niewidocznymi logami `setting/`, mozna rozwazyc `@silver-zepp/vis-log`, ale nie jest to baseline v1.

## Decyzje zamrozone

- Official `@zos/*` only.
- Brak `app-service/` w pierwszym scaffoldu.
- Brak widgets i cards.
- Brak BLE.
- Layouty osobno dla round i square.
- Phone-side sync przez `app-side/` jest obowiazkowy, nie opcjonalny.
