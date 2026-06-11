# goals.md — Cele biznesowe (fazy projektu)

> **STATUS PROJEKTU: FAZA 1 — w trakcie.** AI pracujące w tym repo realizuje obecnie cele Fazy 1 z Tech Leadem. Po zakończeniu Fazy 1 status zostanie zmieniony, a repo przekazane Kandydatowi do realizacji Fazy 2.

---

## FAZA 1 — Rdzeń aplikacji (Tech Lead)

Cel: solidny, zgodny ze standardami z `.github/instructions/` fundament, na którym kandydat będzie budował w Fazie 2.

### 1.1. System Zarządzania Użytkownikami i Autentykacja (`apps/api`)

- Model `User` w Prisma: `id`, `email` (unique), `passwordHash`, `role` (`ADMIN` | `MANAGER` | `ANALYST`), `isActive`, `createdAt`, `updatedAt`.
- Rejestracja (`POST /auth/register`) i logowanie (`POST /auth/login`) — JWT (access + refresh), hashowanie haseł przez `argon2`/`bcrypt`.
- Odświeżanie sesji (`POST /auth/refresh`) — wymiana ważnego refresh tokena na nową parę tokenów.
- Nowo zarejestrowany użytkownik dostaje rolę `ANALYST` (najniższe uprawnienia); rolę może zmienić wyłącznie `ADMIN` przez CRUD `/users`.
- Guardy: `JwtAuthGuard` (globalny, z dekoratorem `@Public()` dla wyjątków) + `RolesGuard` z dekoratorem `@Roles()`.
- CRUD użytkowników (`/users`) dostępny tylko dla `ADMIN`; użytkownik może czytać/edytować własny profil (`/users/me`).
- Soft-deactivation zamiast twardego usuwania (`isActive: false`); nieaktywny użytkownik nie może się zalogować.

### 1.2. Moduł Core API (`apps/api`)

- Globalny custom exception filter zgodny z `nestjs.instructions.md` §6 (z mapowaniem błędów Prisma).
- Globalny `ValidationPipe` w konfiguracji z `nestjs.instructions.md` §5.3.
- `PrismaService` + health-check (`GET /health` — status aplikacji i połączenia z bazą).
- Walidacja zmiennych środowiskowych przy starcie; interceptor logujący żądania (`requestId`, czas odpowiedzi).
- Wersjonowanie API (`/api/v1`), konfiguracja CORS, Swagger (`/api/docs`).

### 1.3. Baza frontendu (`apps/web`)

- Layout z nawigacją, strony: logowanie, rejestracja, lista użytkowników (tylko ADMIN), profil.
- Autentykacja po stronie web: przechowywanie sesji w httpOnly cookies, middleware chroniący trasy, redirecty wg roli.
- Wzorcowa implementacja `loading.tsx` / `error.tsx` / `not-found.tsx` dla segmentu `users` — to wzorzec dla Fazy 2.

### 1.4. Mock API analizy tekstu + seed (przygotowanie pod Fazę 2)

- **Mock zewnętrznego API analizy tekstu** (`apps/mock-analytics` — minimalny serwer HTTP): `POST /analyze` przyjmuje tekst, zwraca `{ sentiment, keywords[] }`.
- Mock MUSI deterministycznie symulować awarie, sterowane treścią/nagłówkiem żądania (udokumentowane w README mocka):
  - opóźniona odpowiedź / timeout,
  - HTTP 500/503,
  - odpowiedź niezgodna ze schematem (np. brak pola `sentiment`).
    Bez tego kandydat nie ma jak uczciwie przetestować edge-case'ów z §2.1.
- **Seed danych przykładowych:** oprócz kont per rola — przykładowe rekordy analiz (w tym `FAILED`) i użytkownik nieaktywny, aby moduł raportów (§2.2) dał się budować i testować niezależnie od ukończenia §2.1.

### Definition of Done Fazy 1

- Wszystkie punkty z `workflow.instructions.md` §3 spełnione (testy!), seed tworzy konta testowe dla każdej roli + dane przykładowe z §1.4, `docker compose up` + 3 komendy wystarczą do uruchomienia całości.
- Rdzeń jest **wzorcem** dla Fazy 2: minimum jeden kompletny przykład modułu encji + modułu feature z pełnymi testami (users/auth) — kandydat będzie kopiował te wzorce.

---

## FAZA 2 — Zadanie dla Kandydata

> **Drogi Kandydacie:** otrzymujesz działający rdzeń aplikacji. Twoim zadaniem jest dopisanie **dwóch modułów** opisanych poniżej, w pełnej zgodzie ze standardami i workflow z `.github/instructions/`. Możesz (i powinieneś) korzystać z AI — oceniamy m.in. to, jak skutecznie zmuszasz je do przestrzegania naszych standardów oraz jak weryfikujesz jego wyniki.
>
> **Priorytety, gdy zabraknie czasu:** oceniamy głębię, nie szerokość. Lepiej dowieźć moduł §2.1 w całości (z edge-case'ami i testami), a §2.2 zrealizować częściowo — wtedy brakujący zakres opisz projektowo (decyzje, model autoryzacji, plan testów) w README modułu. Dwa moduły "na pół gwizdka" to najgorszy wariant.

### 2.1. Moduł Analityki AI (`analytics`)

Moduł integruje się z **zewnętrznym API analizy tekstu** (na potrzeby zadania: mock dostarczony w repo — `apps/mock-analytics`, z trybami awarii opisanymi w jego README), które dla podanego tekstu zwraca sentyment i słowa kluczowe.

Wymagania funkcjonalne:

- `POST /api/v1/analytics/analyze` — przyjmuje tekst (np. notatkę o użytkowniku), wysyła do zewnętrznego API, zapisuje wynik analizy w bazie powiązany z użytkownikiem.
- `GET /api/v1/analytics/users/:id` — historia analiz danego użytkownika (paginowana).
- Widok w `apps/web`: formularz analizy + lista wyników z czytelną prezentacją stanów ładowania i błędów (natywne pliki Next.js).

**Edge-cases, które MUSISZ obsłużyć (kluczowe kryterium oceny):**

1. **Zewnętrzne API nie odpowiada** (timeout) lub zwraca 5xx — aplikacja NIE może zwrócić surowego 500. Wymagane: timeout żądania, **retry z backoffem (max 2 ponowienia)**, a po wyczerpaniu prób — czytelny błąd domenowy (`ANALYTICS_PROVIDER_UNAVAILABLE`, HTTP 503) przez globalny filtr. Żądanie użytkownika i fakt niepowodzenia muszą zostać zapisane (status `FAILED`), aby dało się je ponowić.
2. **Zewnętrzne API zwraca odpowiedź częściową lub niezgodną ze schematem** (np. brak pola `sentiment`) — odpowiedź MUSI być walidowana po stronie backendu; niekompletne dane nie mogą trafić do bazy jako "udana" analiza.
3. **Idempotencja:** ponowne wysłanie identycznego tekstu dla tego samego użytkownika w krótkim czasie nie powinno tworzyć duplikatu analizy — zaprojektuj i uzasadnij mechanizm (hash treści? okno czasowe?).
4. Frontend musi rozróżniać stany: "w trakcie analizy", "niepowodzenie z możliwością ponowienia", "wynik gotowy" — bez ręcznych flag `isLoading` tam, gdzie wystarczą mechanizmy App Routera.

### 2.2. Moduł Raportowania (`reports`)

Moduł generuje raporty zbiorcze z danych o użytkownikach i analizach.

Wymagania funkcjonalne:

- `POST /api/v1/reports` — zlecenie wygenerowania raportu za zakres dat (raport liczony asynchronicznie lub synchronicznie — wybór uzasadnij).
- `GET /api/v1/reports/:id` — pobranie raportu (metadane + dane zagregowane: liczba analiz, rozkład sentymentu, najaktywniejsi użytkownicy).
- Widok listy raportów + szczegółów raportu w `apps/web`.

**Edge-cases, które MUSISZ obsłużyć (kluczowe kryterium oceny):**

1. **Walidacja skomplikowanych ról:** dostęp do raportów zależy od kombinacji warunków, nie od samej roli:
   - `ADMIN` — widzi wszystkie raporty;
   - `MANAGER` — widzi raporty, które sam zlecił; NIGDY nie widzi raportów obejmujących WYŁĄCZNIE użytkowników nieaktywnych (dane archiwalne zastrzeżone dla ADMIN) — nawet jeśli sam je zlecił;
   - `ANALYST` — może zlecać raporty, ale widzi w nich tylko dane zagregowane (bez listy nazwisk/e-maili użytkowników) — ten sam endpoint, różny kształt odpowiedzi zależnie od roli;
   - użytkownik z `isActive: false` — żaden dostęp (nawet z ważnym, niewygasłym JWT).
     Prosty `RolesGuard` nie wystarczy — wymagana jest warstwa autoryzacji uwzględniająca kontekst zasobu. Zaprojektuj ją i przetestuj jednostkowo każdą kombinację.
2. **Zakres dat bez danych** — raport "pusty" jest poprawnym wynikiem (200, nie 404), z jawnym oznaczeniem `isEmpty`.
3. **Nieprawidłowe zakresy** — `dateFrom > dateTo`, zakres w przyszłości, zakres dłuższy niż 365 dni → walidacja na poziomie DTO z czytelnymi komunikatami (nie logika w kontrolerze).
4. **Raport odwołujący się do analiz `FAILED`** — zdecyduj i udokumentuj, czy wliczają się do agregacji; decyzja musi być spójna i pokryta testem.

### Kryteria sukcesu (jak oceniamy)

| Obszar                      | Co sprawdzamy                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Zgodność ze standardami** | Czy kod trzyma się `.github/instructions/` (ścisłe DTO, filtr wyjątków, Server/Client Components), czy wygląda jak generyczny kod z tutoriala          |
| **Edge-cases**              | Czy WSZYSTKIE wymienione przypadki brzegowe są obsłużone i przetestowane — to one odróżniają myślenie inżynierskie od prostego CRUD-a z AI             |
| **Testy**                   | Pokrycie logiki biznesowej i endpointów, w tym ścieżki błędne; jakość asercji, nie sama liczba testów                                                  |
| **Historia pracy**          | Drobne, logiczne commity w konwencji `typ(zakres): opis` zgodnie z `workflow.instructions.md` §2 — czytelna historia zamiast jednego wielkiego commita |
| **Decyzje projektowe**      | Tam, gdzie zadanie zostawia wybór (idempotencja, async raporty, analizy FAILED) — oceniamy uzasadnienie, nie konkretny wybór                           |
| **Uruchamialność**          | Projekt po świeżym klonie odpala się komendami z README (w tym migracje i seed); testy przechodzą jedną komendą — sprawdzamy to w pierwszej kolejności |

> Niejasności w wymaganiach są częściowo zamierzone — udokumentuj przyjęte założenia (np. w README modułu) zamiast zgadywać po cichu.
