# Webshop-Integration – Entwickler-Checkliste

Diese Checkliste führt durch die finale Inbetriebnahme der WooCommerce-Anbindung
und der E-Mail-Funktionen von **BusinessSuite**. Alle Funktionen arbeiten
**quellenunabhängig** – sie gelten gleichermaßen für manuell erfasste
Bestellungen (`source = MANUAL/PHONE`) und Shop-Bestellungen (`source = ONLINESHOP`).

---

## 1. Umgebungsvariablen (Vercel → Project → Settings → Environment Variables)

| Variable | Zweck | Woher der Wert kommt |
|---|---|---|
| `WOOCOMMERCE_WEBHOOK_SECRET` | HMAC-Prüfung der eingehenden Webhooks. Muss **identisch** zum Secret im WooCommerce-Webhook sein. | Selbst erzeugen, z. B. `openssl rand -hex 32`. Denselben Wert in Vercel **und** im Webhook eintragen. |
| `RESEND_API_KEY` | E-Mail-Versand (Nachbestellung + Dokumentversand) über Resend. Ohne diesen Key werden Mails nur geloggt, nicht gesendet. | Resend-Dashboard → API Keys. Alternativ SMTP-Lösung implementieren. |
| `MAIL_FROM` | Absender der E-Mails, Format `Name <mail@deine-domain>`. | Muss eine in Resend **verifizierte Domain** sein (sonst lehnt Resend ab). |
| `BLOB_READ_WRITE_TOKEN` | Datei-Uploads (Firmenlogo, Eingangsrechnungen, Mail-Anhänge). | Wird automatisch gesetzt, sobald in Vercel → **Storage → Blob** ein Store angelegt und mit dem Projekt verbunden ist. |
| `CRON_SECRET` *(empfohlen)* | Schützt die Cron-Endpunkte (`/api/cron/*`). | Selbst erzeugen (`openssl rand -hex 32`). |
| `AUTH_SECRET` *(bereits gesetzt)* | Signatur des Session-Cookies. | Bereits vorhanden. |

> **Wichtig:** Nach dem Setzen/Ändern einer Variable **neu deployen** (Deployments → … → Redeploy), sonst greift sie nicht – Env-Variablen werden pro Deployment gebunden.

---

## 2. WooCommerce-Webhook einrichten

WordPress-Admin → **WooCommerce → Einstellungen → Erweitert → Webhooks → „Webhook hinzufügen"**.
Lege **zwei** Webhooks an (ein Thema pro Webhook):

| Feld | Webhook 1 | Webhook 2 |
|---|---|---|
| Name | BusinessSuite – Bestellung erstellt | BusinessSuite – Bestellung aktualisiert |
| Status | Aktiv | Aktiv |
| Thema | Bestellung erstellt (`order.created`) | Bestellung aktualisiert (`order.updated`) |
| Lieferungs-URL | `https://businesssuite.vercel.app/api/webhooks/woocommerce` | (gleich) |
| Geheimer Schlüssel | = `WOOCOMMERCE_WEBHOOK_SECRET` | (gleich) |
| API-Version | WP REST API Integration v3 | v3 |

Beim Speichern sendet WooCommerce einen Ping → unser Endpunkt antwortet bei
gültiger Signatur mit 200. Springt der Webhook auf „deaktiviert", stimmt meist
das Secret nicht oder das Vercel-Redeploy fehlt.

**Schnelltest (ohne Shop):**
- `GET …/api/webhooks/woocommerce` → **405** (Route existiert).
- `POST` ohne gültige Signatur → **401** (Secret aktiv). Liefert es **503**, ist `WOOCOMMERCE_WEBHOOK_SECRET` nicht gesetzt/nicht deployt.

---

## 3. Produkt-/SKU-Abgleich

Die Zuordnung Shop-Position → BusinessSuite-Produkt erfolgt **ausschließlich über die SKU**.

- Jede **verkaufbare** Position im Shop muss dieselbe **SKU** haben wie das
  zugehörige Produkt in BusinessSuite (Produkte-Seite, Feld SKU).
- **Treffer:** Fertigerzeugnis-Bestand wird um die bestellte Menge reduziert;
  reicht der Bestand nicht, werden automatisch Produktionsaufträge für das
  fehlende Stück erzeugt.
- **Kein Treffer** (SKU fehlt oder unbekannt): Bestellung wird trotzdem angelegt
  (Position als Freitext), **kein Absturz**, aber die Bestellung wird sichtbar
  markiert: Spalte **„Hinweis: ⚠ SKU offen"** in der Bestellliste und ein
  Warnhinweis auf der Auftrags-Detailseite. Diese Bestellungen manuell prüfen
  und SKUs in Shop/BusinessSuite angleichen.

---

## 4. Zahlungsdienstleister

- Die **Zahlung selbst wickelt der Shop** ab (PayPal, Klarna, Kreditkarte,
  Vorkasse, …). BusinessSuite betreibt **kein eigenes Payment-Processing** und
  speichert **keine Kartendaten**.
- Aus dem Webhook übernommen und an Bestellung/Rechnung gespeichert werden nur:
  `payment_method_title`/`payment_method`, `transaction_id` (Referenz),
  `date_paid`, `currency` sowie die Gesamtbeträge.
- Ist die Shop-Bestellung als **bezahlt** markiert (`date_paid` gesetzt), wird die
  zugehörige Rechnung in BusinessSuite automatisch auf **PAID** gesetzt.
- Im Shop müssen die gewünschten Zahlungsarten aktiviert sein; die übergebenen
  Felder erscheinen auf der Auftrags-Detailseite unter „Zahlart/Zahlungsref./Bezahlt am".

---

## 5. Test-Ablauf vor Go-Live

1. **Webhook-Testzustellung** in WooCommerce auslösen → Lieferungs-Log zeigt **200**.
2. **Test-Bestellung** im Shop mit einer **bekannten SKU** aufgeben und bezahlen.
3. Prüfen in BusinessSuite:
   - (a) Bestellung erscheint unter **Bestellungen** mit Quelle **„Online-Shop"**.
   - (b) **Lagerbestand** des Produkts ist um die bestellte Menge gesunken (bei Unterdeckung Produktionsauftrag angelegt).
   - (c) **Zahlungsstatus**: Zahlart/Referenz/Bezahlt-Datum gesetzt; ggf. Rechnung auf „bezahlt".
   - (d) **Dokumentversand**: Auf der Auftrags-/Rechnungs-Detailseite „Per E-Mail senden" → PDF kommt als Anhang an.
   - (e) **Nachbestell-Mail**: Sinkt ein **Bauteil** durch Produktion auf/unter Mindestbestand, geht eine Nachbestell-Mail an die Einkaufsadresse (Test via Einstellungen → „Test-Nachbestellung senden").
4. **Storno/Refund** im Shop testen → Bestellung wird storniert und der zuvor abgebuchte Bestand zurückgebucht.
5. **Idempotenz**: dieselbe Bestellung mehrfach senden → keine Dublette (Abgleich über Woo-Order-ID).

---

## 6. Manueller Betrieb (ohne Shop)

Dieselben Abläufe funktionieren für **händisch** angelegte Bestellungen:
- **PDF**: Angebot, Auftragsbestätigung, Lieferschein, Rechnung über die
  Dokument-Buttons (gleiche Engine wie der Shop-Pfad).
- **Versand**: „Per E-Mail senden" auf Angebot/Auftrag/Rechnung mit
  vorbefüllter, editierbarer Empfängeradresse.
- **Lager/Produktion**: Entnahmen über Produktion buchen Bauteilbestände ab und
  lösen bei Mindestbestand Nachbestell-Mails aus.
- **Nachbestellung**: identische Logik wie beim Shop, quellenunabhängig.

---

## 7. Bekannte Grenzen / TODOs

- **E-Mail-Vorlagen** (Betreff/Text für den Dokumentversand) sind aktuell sinnvolle
  Code-Defaults mit Belegnummer/Label + Fußzeile aus den Einstellungen. Eine
  vollständig im UI editierbare Vorlagenverwaltung ist noch offen.
- **StockMovement** wird für **Bauteile** (Components) geführt; der
  Fertigerzeugnis-Bestand (Product) wird direkt fortgeschrieben (kein separates
  Movement-Log am Product) – ausreichend für die Bestandsführung, aber ohne
  Einzelbuchungs-Historie am Produkt.
- **SVG-Logos** werden in PDFs nicht eingebettet (nur PNG/JPG); bei SVG erscheint
  das PDF ohne Logo (kein Fehler). Für PDF-Logo daher PNG/JPG hochladen.
- **Cron-Frequenz**: Auf dem Vercel **Hobby**-Plan laufen Crons nur **1×/Tag**
  (`lead-followups` 06:00, `scan-inbox` 07:00 UTC). Für häufigere Läufe Pro-Plan
  + Schedule in `vercel.json` anpassen.
- **Gmail-Eingangsrechnungs-Import** (A6.2) benötigt zusätzlich
  `GMAIL_CLIENT_ID/SECRET/REFRESH_TOKEN` (separat von dieser Shop-Anbindung).
- **Mehrere PDF-Anhänge pro Mail**: aktuell wird genau ein Beleg pro Versand
  angehängt.
