# PourOverFlow v1 - cele produktu

## Misja

PourOverFlow ma pomagac w powtarzalnym parzeniu kawy na zegarku Zepp bez zmuszania uzytkownika do patrzenia w telefon podczas calego procesu. Zegarek ma pelnic role lekkiego "brew coacha": prowadzi przez przepis krok po kroku, pilnuje czasu, przypomina o akcjach i pozwala wznowic sesje po chwilowym przerwaniu.

## Problem, ktory rozwiazujemy

Domowe parzenie kawy czesto wymaga jednoczesnie:

- sledzenia czasu calej sesji,
- sledzenia czasu pojedynczych krokow,
- pamietania ilosci wody lub kolejnych akcji,
- trzymania przepisu w poblizu,
- szybkiego wznowienia po wygaszeniu ekranu albo chwilowym odejsciu.

Telefon jest dobry do edycji i archiwizacji, ale slaby jako ekran "operacyjny" przy samym parzeniu. Zegarek jest dobry do wykonania przepisu, ale nie do rozbudowanej edycji. Produkt ma wykorzystywac ten podzial odpowiedzialnosci celowo.

## Docelowy uzytkownik

### Primary persona

Domowy entuzjasta kawy, ktory:

- parzy recznie kilka razy w tygodniu,
- korzysta z kilku znanych narzedzi do parzenia,
- zapisuje wlasne warianty receptur,
- chce powtarzalnosci bez stalego zerkania w telefon.

### Secondary persona

Uzytkownik Zepp/Amazfit, ktory chce prostego flow "wybierz -> odpal -> wykonaj", bez wchodzenia w chmure, konto i synchronizacje miedzy wieloma telefonami.

## V1 scope

### Watch experience

- wybor narzedzia z ograniczonego, globalnego katalogu wspieranych brewerow,
- wybor receptury przypisanej do wybranego narzedzia,
- uruchomienie sesji parzenia,
- prowadzenie przez kroki z timerem kroku i timerem calej sesji,
- kroki wymagajace recznego przejscia dalej,
- best-effort feedback haptyczny i opcjonalny audio,
- wznowienie sesji po ponownym otwarciu aplikacji lub wybudzeniu zegarka,
- zapis ostatniego wyniku po zakonczeniu sesji.

### Phone experience

- pelny manager receptur w `setting/`,
- przegladanie historii parzen,
- edycja notatek i oceny po zakonczonym parzeniu,
- seedowanie i przechowywanie kanonicznego katalogu narzedzi, receptur i historii,
- synchronizacja danych do zegarka przez `app-side/`.

## Twarde zalozenia produktu

- v1 nie ma chmury, kont, backendu ani importu zewnetrznych receptur,
- katalog narzedzi jest zamkniety i globalny,
- uzytkownik nie dodaje wlasnych typow narzedzi w v1,
- historia jest kanoniczna po stronie telefonu,
- zegarek ma byc odporny na chwilowy brak telefonu i uruchamiac sie z lokalnego cache,
- trwajaca sesja zawsze pracuje na snapshotcie receptury z momentu startu.

## Katalog wspieranych narzedzi v1

Ponizsza lista jest zamrozona dla v1. Kazde `toolId` jest stabilne, czytelne ASCII i nie moze byc zmienione po wdrozeniu.

| toolId | Label | Icon stem | Domyslna kolejnosc | Uwagi |
| --- | --- | --- | --- | --- |
| `tool_aeropress` | AeroPress | `tool-aeropress` | `10` | najbogatsza kategoria startowa |
| `tool_v60` | Hario V60 | `tool-v60` | `20` | klasyczny dripper pour-over |
| `tool_kalita_wave` | Kalita Wave | `tool-kalita-wave` | `30` | plaska geometria, inne tempo zalewania |
| `tool_chemex` | Chemex | `tool-chemex` | `40` | wieksza pojemnosc, dluzsze kroki |
| `tool_clever_dripper` | Clever Dripper | `tool-clever-dripper` | `50` | hybryda immersion + drawdown |
| `tool_french_press` | French Press | `tool-french-press` | `60` | immersion, dluzsze czasy |

### Reguly katalogu narzedzi

- To sa jedyne narzedzia, jakie moze wybrac uzytkownik w v1.
- Telefon nie oferuje formularza tworzenia nowego `Tool`.
- Seed danych ma zainstalowac caly katalog przy pierwszym uruchomieniu.
- Receptura z nieznanym `toolId` jest niewazna i ma byc odrzucona juz po stronie telefonu.

## Seed library v1

Seed library ma byc kuratorowana, ale lekka:

- minimalny shipping bar: co najmniej 1 receptura startowa na kazde wspierane narzedzie,
- target produktowy: 2 receptury startowe na kazde narzedzie,
- seed recipes maja byc edytowalne i klonowalne przez uzytkownika,
- seed recipes maja korzystac tylko z modelu krokow wspieranego przez v1.

## Jak traktowac przyklady z serwisow zewnetrznych

Serwisy takie jak AeroPrecipe sa tylko wzorcem domeny, nie zrodlem importu danych. Moga inspirowac:

- zestaw pol metadata przepisu,
- nazewnictwo krokow,
- sposob zapisu dozy, temperatury, filtra i czasu,
- rozroznienie pomiedzy przepisem a wynikiem konkretnej sesji.

Nie wolno projektowac v1 tak, jakby aplikacja miala od razu ingestowac zewnetrzne bazy receptur.

## Minimalny model produktu

### Receptura

Receptura musi przechowywac:

- nazwe,
- przypisane narzedzie,
- kolor receptury,
- opis,
- doze kawy,
- laczna ilosc wody,
- temperature wody,
- rodzaj filtra,
- opis mielenia,
- orientacyjny czas calosci,
- liste krokow,
- notatki autora receptury.

### Krok przepisu

Pojedynczy krok musi umiec opisac:

- tekst instrukcji,
- czas pojedynczego kroku, jesli dotyczy,
- czy uzytkownik musi nacisnac "dalej",
- opcjonalna ilosc wody dla kroku,
- opcjonalny target lacznej wody po kroku,
- typ feedbacku.

### Wynik sesji

Wynik sesji musi umiec opisac:

- z jakiej receptury i jakiego narzedzia pochodzila sesja,
- kiedy sesja sie zaczela i skonczyla,
- czy zostala zakonczona, przerwana albo porzucona,
- jak dlugo trwala,
- jakie byly rzeczywiste czasy krokow,
- notatke i ocene dodawana glownie na telefonie.

## UX principles

### 1. Zegarek ma byc wykonawczy, nie edycyjny

Watch UI ma maksymalnie upraszczac decyzje w trakcie parzenia. Zegarek nie jest miejscem do tworzenia skomplikowanych receptur ani przegladania pelnego archiwum.

### 2. Telefon ma byc zrodlem prawdy

To telefon odpowiada za edycje, katalog i archiwum. Zegarek pracuje na lokalnym cache i danych sesji.

### 3. Resume jest wazniejsze niz "pelne tlo"

Uzytkownik ma po powrocie widziec sensowny stan sesji. V1 nie obiecuje niezawodnego background engine.

### 4. Malo decyzji podczas parzenia

Na zegarku flow ma miec tylko trzy glownie tryby:

- wybierz narzedzie,
- wybierz recepture,
- wykonaj sesje.

### 5. Historia ma byc trwala wobec zmian w bibliotece

Usuniecie receptury nie moze zniszczyc historii. Historia zawsze przechowuje snapshot.

## Sukces v1

V1 uznajemy za gotowe, gdy:

- uzytkownik moze wybrac jedno ze wspieranych narzedzi i uruchomic recepture na zegarku,
- zegarek poprawnie przeprowadza przez kroki z timerami i krokami recznymi,
- aktywna sesja daje sie wznowic po powrocie do aplikacji,
- telefon pozwala tworzyc, edytowac i usuwac receptury,
- historia jest zapisywana, widoczna na telefonie i nie znika po usunieciu receptury,
- zegarek dziala z lokalnego cache, gdy telefon nie jest chwilowo dostepny.

## Poza v1

- backend, logowanie, chmura i multi-device sync,
- import z serwisow zewnetrznych,
- user-defined tools,
- pelna historia na zegarku,
- workout extension, widgets i shortcut cards,
- App Service jako twardy filar timera,
- rozbudowana analityka typu extraction, TDS albo integracje z wagami/BLE.

## Decyzje, ktorych kolejny agent nie ma juz podejmowac

- Katalog narzedzi jest zamkniety.
- Historia jest kanoniczna na telefonie.
- Zegarek pokazuje tylko ostatni wynik, nie pelne archiwum.
- Trwajaca sesja pracuje na snapshotcie.
- Multi-brewer jest w scope v1.
- Round i square sa w scope v1; band nie.
