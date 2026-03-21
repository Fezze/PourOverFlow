# PourOverFlow v1 - manifest i kontrakt UI

## Cel dokumentu

Ten dokument zamraza dwa obszary, ktore musza byc decision-complete przed Etapem 2:

- szkic `app.json` dla Zepp OS v4 baseline,
- kontrakt implementacyjny dla `setting/index.jsx`.

Dokument korzysta z oficjalnych zalozen Zeppa dotyczacych `app.json v3+`, screen adaptation i `AppSettingsPage`.

## Oficjalne punkty odniesienia

- `app.json v3+` wymaga m.in. `configVersion`, `app`, `runtime`, `permissions`, `targets`, `i18n`, `defaultLanguage`.
- `setting` i `app-side` sa opcjonalnymi modulami `targets.*.module`.
- `AppSettingsPage` ma tylko lifecycle `build(props)` i korzysta z `props.settingsStorage`.
- `target.platforms` w `app.json v3+` moze byc oparte o cechy ekranu `st: "r"` i `st: "s"`.

Zrodla:

- https://docs.zepp.com/docs/reference/app-json/
- https://docs.zepp.com/docs/guides/framework/device/screen-adaption/
- https://docs.zepp.com/docs/guides/framework/app-settings/register/
- https://docs.zepp.com/docs/guides/framework/app-settings/ui-intro/
- https://docs.zepp.com/docs/reference/app-settings-api/ui/section/
- https://docs.zepp.com/docs/reference/app-settings-api/ui/textinput/
- https://docs.zepp.com/docs/reference/app-settings-api/ui/select/

## `app.json` contract

### Docelowy ksztalt

Implementacja Etapu 2 ma wystartowac od takiego szkicu:

```json
{
  "configVersion": "v3",
  "app": {
    "appId": 0,
    "appName": "PourOverFlow",
    "appType": "app",
    "version": {
      "code": 1,
      "name": "0.1.0"
    },
    "icon": "icon.png",
    "vender": "pouroverflow",
    "description": "Manual coffee brewing flow for Zepp OS"
  },
  "permissions": [
    "device:os.local_storage"
  ],
  "runtime": {
    "apiVersion": {
      "minVersion": "4.0",
      "compatible": "4.0",
      "target": "4.0"
    },
    "type": "0"
  },
  "targets": {
    "common": {
      "module": {
        "page": {
          "pages": [
            "page/home/index",
            "page/tool-list/index",
            "page/recipe-list/index",
            "page/brew-active/index",
            "page/result-summary/index"
          ]
        },
        "app-side": {
          "path": "app-side/index"
        },
        "setting": {
          "path": "setting/index"
        }
      },
      "platforms": [
        {
          "st": "r"
        },
        {
          "st": "s"
        }
      ]
    }
  },
  "i18n": {
    "en-US": {
      "appName": "PourOverFlow"
    },
    "pl-PL": {
      "appName": "PourOverFlow"
    }
  },
  "defaultLanguage": "en-US"
}
```

### Reguly dla implementera

- `appId` jest placeholderem do podmiany, jesli projekt bedzie rejestrowany w konkretnym koncie.
- `vender` ma pozostac ASCII.
- W pierwszym scaffoldu nie wymuszac `runtime.type`, bo oficjalne szablony `os4.0` Zeusa go nie wymagaja do poprawnego builda.
- Nie dodawac `designWidth` w pierwszym scaffoldu.
- Nie dodawac `app-service`, `secondary-widget`, `app-widget`, `data-widget` ani BLE permissions.
- Nie dodawac targetu `band`.

## Struktura plikow wynikajaca z manifestu

Z `app.json` i screen adaptation wynika obowiazkowa struktura:

```text
assets/
  common.r/
  common.s/
page/home/index.js
page/home/index.r.layout.js
page/home/index.s.layout.js
page/tool-list/index.js
page/tool-list/index.r.layout.js
page/tool-list/index.s.layout.js
page/recipe-list/index.js
page/recipe-list/index.r.layout.js
page/recipe-list/index.s.layout.js
page/brew-active/index.js
page/brew-active/index.r.layout.js
page/brew-active/index.s.layout.js
page/result-summary/index.js
page/result-summary/index.r.layout.js
page/result-summary/index.s.layout.js
setting/index.jsx
app-side/index.js
```

## Asset contract dla ikon

### Root app icon

- `icon.png` w root projektu
- dla target-based scaffoldu Zeusa praktyczny baseline to rowniez:
  - `assets/common.r/icon.png`
  - `assets/common.s/icon.png`

### Tool icons

Ikony narzedzi maja byc trzymane parami zasobow round/square:

- `assets/common.r/tool-aeropress.png`
- `assets/common.s/tool-aeropress.png`
- `assets/common.r/tool-v60.png`
- `assets/common.s/tool-v60.png`
- `assets/common.r/tool-kalita-wave.png`
- `assets/common.s/tool-kalita-wave.png`
- `assets/common.r/tool-chemex.png`
- `assets/common.s/tool-chemex.png`
- `assets/common.r/tool-clever-dripper.png`
- `assets/common.s/tool-clever-dripper.png`
- `assets/common.r/tool-french-press.png`
- `assets/common.s/tool-french-press.png`

### Zasada mapowania

`ToolDefinition.iconStem` wskazuje na nazwe assetu bez rozszerzenia. Watch UI nie powinno zawierac recznego switcha po `toolId`, jesli ten sam efekt da sie osiagnac przez `iconStem`.

## Kontrakt `setting/index.jsx`

### Uwaga implementacyjna dla Etapu 2

Jesli toolchain Zeusa nie wykrywa bezposrednio `setting/index.jsx` jako entrypointu `setting.path`, wolno dodac cienki shim `setting/index.js`, ktory tylko importuje docelowy plik `.jsx`. Zrodlo logiki Settings App nadal ma pozostac w `.jsx`.

### Constructor shape

`setting/index.jsx` ma byc zbudowane na `AppSettingsPage({ state, build(props), ...helpers })`.

Zalecana struktura:

```js
AppSettingsPage({
  state: {
    view: 'library-home',
    selectedToolId: null,
    editingRecipeId: null,
    selectedHistoryId: null,
    draftRecipe: null,
    syncMeta: null
  },
  build(props) {
    this.hydrateFromStorage(props)
    return this.renderView(props)
  },
  hydrateFromStorage(props) {},
  renderView(props) {}
})
```

### Dozwolone widoki

`view` moze przyjmowac tylko:

- `library-home`
- `recipe-list`
- `recipe-editor`
- `history-list`
- `history-detail`
- `about-sync`

Nie tworzyc dodatkowych ukrytych widokow dla eksperymentow.

## Zasady UI dla Settings App

### Komponenty bazowe

Implementer ma budowac `setting/` glownie z:

- `Section`
- `TextInput`
- `Select`
- `Button`

To jest celowe. V1 ma byc prosty, czytelny i zgodny z dokumentacja Zeppa, bez rozbudowanego custom UI system.

### Polityka formularzy

- Jeden logiczny formularz = jedna sekcja lub grupa sekcji.
- Kazda istotna akcja ma jawny `Button`.
- Pola z ograniczonym zestawem opcji maja uzywac `Select`, nie wolnego tekstu.
- `toolId`, `colorToken`, `kind` i `feedbackCue` nie moga byc text inputami.

### Polityka zapisu

- Zmiany formularza trzymac najpierw w `this.state.draftRecipe`.
- Persist do `settingsStorage` robic dopiero na `Save`.
- Wyjatkiem sa proste akcje jak `Delete`, `Duplicate` albo edycja notatki historii, ktore moga zapisywac od razu po kliknieciu.

## Kontrakt widokow `setting/`

### `library-home`

Ma zawierac:

- `Section` z lista wspieranych narzedzi i liczba receptur,
- `Button` do przejscia do historii,
- `Section` ze stanem synchronizacji.

Kazdy wspierany `toolId` ma byc widoczny nawet, jesli ma 0 receptur.

### `recipe-list`

Ma zawierac:

- tytul z nazwa narzedzia,
- liste receptur dla jednego `selectedToolId`,
- `Button` `Create`,
- dla kazdej receptury akcje `Edit`, `Duplicate`, `Delete`.

Sortowanie:

1. `updatedAt desc`
2. `name asc`

### `recipe-editor`

Ma zawierac sekcje:

1. `Identity`
   - `name`
   - `toolId`
   - `colorToken`
2. `Brew metadata`
   - `description`
   - `coffeeDoseG`
   - `totalWaterMl`
   - `waterTempC`
   - `filterLabel`
   - `grindLabel`
   - `estimatedTotalDurationMs`
3. `Steps`
   - powtarzalne sekcje per krok
4. `Notes`
   - `notes`
5. `Actions`
   - `Save`
   - `Cancel`

### `history-list`

Ma zawierac:

- liste `HistoryIndexEntry`,
- status,
- nazwe receptury,
- date/czas zakonczenia,
- wejscie w `history-detail`.

Nie dodawac zaawansowanych filtrow jako baseline.

### `history-detail`

Ma zawierac:

- snapshot receptury,
- przebieg krokow,
- `userRating`,
- `userNote`,
- `Save notes`.

To jest jedyne miejsce edycji notatki i oceny.

### `about-sync`

Ma zawierac:

- ostatnie rewizje sync,
- informacje o telefonie jako source of truth,
- krotkie wyjasnienie, ze watch przechowuje tylko cache i aktywna sesje.

## Kontrakt edytora krokow

### Rendering

Kroki maja byc edytowane jako lista sekcji jedna pod druga. V1 nie potrzebuje drag-and-drop.

### Pola kroku

Kazdy krok ma miec edycje:

- `title` przez `TextInput`
- `body` przez `TextInput`
- `kind` przez `Select`
- `durationMs` przez `TextInput`
- `waterMl` przez `TextInput`
- `targetTotalWaterMl` przez `TextInput`
- `requiresConfirm` przez `Select`
- `feedbackCue` przez `Select`

### Akcje na krokach

- `Add step`
- `Move up`
- `Move down`
- `Delete step`

`Delete step` nie moze usunac jedynego kroku bez natychmiastowego dodania nowego.

## Walidacje formularza receptury

Przed zapisem `RecipeRecord`:

- `toolId` musi nalezec do whitelisty,
- `name` nie moze byc pusty,
- `steps.length >= 1`,
- ostatni krok musi miec `kind: "finish"`,
- `order` musi zostac przepisany sekwencyjnie,
- `estimatedTotalDurationMs` nie moze byc mniejsze od sumy `durationMs`.

Jesli walidacja zawiedzie:

- nie zapisuj do `settingsStorage`,
- zostan w `recipe-editor`,
- pokaz prosty komunikat bledu w widoku.

## Implementacyjne wnioski dla Etapu 2 i 3

- Etap 2 ma stworzyc skeleton `app.json` zgodny z tym dokumentem.
- Etap 3 ma implementowac `setting/` zgodnie z tym kontraktem, bez wymyslania nowej architektury formularzy.
- Etap 3 ma seedowac recipe library zgodnie z [05-seed-library.md](c:\Users\krzys\Projects\PourOverFlow\docs\05-seed-library.md).

## Rzeczy swiadomie odlozone

- custom keyboard workflows,
- wielopoziomowy routing w `setting/`,
- import/export recipe files,
- rozbudowane filtry historii,
- dowolne kolory poza `RecipeColorToken`,
- dowolne `toolId`.
