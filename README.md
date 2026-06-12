# Business Suite (MVP)

Internes Business-System (CRM · Bestellungen · Rechnungen · Buchhaltungsarchiv)
als monolithische Next.js-App. Bewusst ohne Overengineering, aber mit sauberer,
ERP-/Shop-erweiterbarer Architektur.

## Tech-Stack

- **Next.js 14** (App Router) + **TypeScript**
- **PostgreSQL** + **Prisma ORM**
- **TailwindCSS**
- Einfache, aber produktionsnah strukturierte **Auth** (bcrypt + signiertes HttpOnly-Cookie)

## Architektur (Clean / Layered)

```
src/
  app/                 # UI- + API-Layer (Next.js App Router)
    (app)/             # Authentifizierte Seiten (Sidebar-Layout)
    login/             # Login (öffentlich)
    api/               # API-Layer: dünne Route-Handler -> rufen Services
  modules/             # Business-Logik, pro Domäne getrennt
    crm/               #   Kunden, Ansprechpartner, Leads
    orders/            #   Bestellungen + Positionen
    invoices/          #   Rechnungen (aus Bestellungen)
    billing-archive/   #   Perioden-Logik, Aggregation, Export (DATEV-ready)
    settings/          #   Firmen-/Rechnungs-Stammdaten (Singleton)
    shared/            #   Belegnummern-Sequenzen
  lib/                 # Infrastruktur: db, auth, money, http
  components/          # Wiederverwendbare UI-Primitives
prisma/
  schema.prisma        # Datenmodell
  seed.ts              # Admin + Beispieldaten
```

**Datenfluss:** `UI / API` → `modules/*.service` (Logik + Validierung via Zod)
→ `lib/db` (Prisma) → PostgreSQL. Die UI-Seiten lesen direkt über Services
(Server Components); Mutationen laufen über den separaten API-Layer.

## Datenmodell (Kurzüberblick)

- `User` – Auth
- `Customer` → `ContactPerson`, `Lead`, `Order`, `Invoice`
- `Order` → `OrderItem` · `Order` 1:1 `Invoice`
- `Invoice` → `InvoiceItem` · gehört zu **`AccountingPeriod`** (Jahr/Quartal/Monat)
- `NumberSequence` – lückenlose, jahresweise Belegnummern
- `CompanySettings` – Singleton-Stammdaten

Beträge sind durchgängig in **Netto / Steuer / Brutto** getrennt gespeichert
(`Decimal(12,2)`) – Voraussetzung für späteren DATEV-Export.

## Setup

```bash
# 1. Abhängigkeiten
npm install

# 2. Env anlegen
cp .env.example .env        # DATABASE_URL & AUTH_SECRET setzen

# 3. Datenbank-Schema + Seed
npm run db:push             # oder: npm run db:migrate
npm run db:seed

# 4. Starten
npm run dev                 # http://localhost:3000
```

Login (aus Seed): `admin@example.com` / `admin1234`

## Rechnungsarchiv & DATEV

- Jede Rechnung wird beim Erstellen automatisch einer `AccountingPeriod`
  (year/month/quarter) zugeordnet.
- Ansicht unter **/billing-archive**: Jahr → Quartal → Monat mit Summen.
- Export pro Monat / Quartal / Jahr als CSV:
  `GET /api/billing-archive/export?year=2026[&quarter=1][&month=3]`
- **DATEV-Vorbereitung:** `modules/billing-archive/export.service.ts` liefert ein
  flaches `ExportRow`-Modell mit allen Pflichtfeldern (Belegnummer, Datum,
  Netto/Steuer/Brutto, USt-IdNr., Steuernummer). Ein späterer DATEV-Adapter
  (EXTF/Buchungsstapel) mappt nur noch `ExportRow` → DATEV-CSV – **ohne**
  Änderung am Datenmodell.

## Erweiterbarkeit (bewusst vorbereitet)

- **Produktkatalog/Shop:** `OrderItem.productName` ist frei – später ein
  optionales `productId`-FK auf eine neue `Product`-Tabelle ergänzbar.
- **Bankabgleich:** `Invoice.status`/`paidAt` vorhanden; ein `Payment`-Modell
  lässt sich ohne Bruch anhängen.
- **Belegnummern:** Format über Settings konfigurierbar, Sequenzen pro Jahr.
