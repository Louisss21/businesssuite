# BusinessSuite – API-Zugang für externe Systeme

Diese Datei beschreibt den Zugang für externe Programme (z. B. einen
Claude-Cowork-Chat, Zapier, eigene Skripte). Sie kann komplett weitergegeben
werden – **der Schlüssel selbst steht bewusst nicht darin.**

## 1. Base-URL

```
https://businesssuite.vercel.app
```

Alle Endpunkte liegen darunter unter `/api/...`.

## 2. Anmeldung

Bei **jeder** Anfrage eine dieser Kopfzeilen mitschicken:

```
Authorization: Bearer DEIN_SCHLUESSEL
```

oder alternativ:

```
x-api-key: DEIN_SCHLUESSEL
```

Den Schlüssel bekommst du separat (nicht per E-Mail/Chat im Klartext weitergeben).

### Falls dein Werkzeug keine eigenen Kopfzeilen setzen kann

Manche Agenten/Werkzeuge können bei einem Web-Abruf nur die Adresse wählen,
aber keine `Authorization`-Kopfzeile mitschicken. Für diesen Fall kann der
Betreiber den Schlüssel zusätzlich als URL-Parameter erlauben:

```
https://businesssuite.vercel.app/api/leads?api_key=DEIN_SCHLUESSEL
```

**Das funktioniert nur, wenn der Betreiber es aktiviert hat**
(`BS_API_ALLOW_QUERY_TOKEN=true`) – sonst kommt `401`. Und: dieser Weg ist
**immer nur lesend**, egal welche Rechte der Schlüssel sonst hat – URLs
landen in Logs und Verläufen, deshalb kann darüber nichts geändert oder
gelöscht werden. Für Schreibzugriff bleibt die Kopfzeile Pflicht.

### Verbindung testen

```bash
curl -s https://businesssuite.vercel.app/api/me \
  -H "Authorization: Bearer DEIN_SCHLUESSEL"
```

Erwartete Antwort – bestätigt Schlüssel, Rolle und Rechte:

```json
{"data":{"name":"...","email":"...","role":"ADMIN","readOnly":false,
         "modules":{"leads":"write","invoices":"write","...":"..."}}}
```

## 3. Antwortformat

| Fall | Form |
|---|---|
| Erfolg | `{"data": ...}` |
| Fehler | `{"error": "Klartext-Meldung"}` |
| Validierungsfehler (422) | `{"error":"Validierungsfehler","issues":{...}}` |

Statuscodes: `200` ok · `401` Schlüssel fehlt/ungültig · `403` Rolle darf das
nicht (oder Nur-Lese-Modus) · `404` nicht gefunden · `409` Konflikt (z. B.
Löschen trotz Verknüpfung) · `422` Eingabe ungültig.

## 4. Wichtigste Endpunkte

Muster überall gleich: `GET` Liste · `POST` anlegen · `GET/PUT/PATCH/DELETE
/<id>` einzeln.

| Bereich | Pfad | Hinweise |
|---|---|---|
| Leads | `/api/leads` | `PATCH /api/leads/<id>` z. B. `{"status":"CONTACTED"}` oder `{"assignedUserId":"<userId>"}` |
| Lead → Kunde | `POST /api/leads/<id>/convert` | |
| Kunden | `/api/customers` | `?search=` und `?type=COMPANY|PRIVATE` |
| Ansprechpartner | `/api/customers/<id>/contacts` | |
| Angebote | `/api/quotes` | `POST /api/quotes/<id>/convert` → Bestellung; `/pdf`, `/send` |
| Bestellungen | `/api/orders` | `/pdf`, `/send`, `/duplicate` |
| Rechnungen | `/api/invoices` | `/pdf`, `/send`, `/dunning` (Mahnung), `/cancel` (Storno) |
| Produkte | `/api/products` | `?search=`, `?active=` |
| Lager/Bauteile | `/api/components` | `POST /api/components/<id>/stock` bucht Bestand |
| Lieferanten | `/api/suppliers` | |
| Produktion | `/api/production` | `/complete-step`, `/serial`, `/cancel` |
| Aufgaben | `/api/tasks` | `?status=`, `?priority=` |
| Aktivitäten | `/api/activities` | Notiz/Anruf/E-Mail/Meeting/Besuch; `?leadId=` oder `?customerId=` |
| Kampagnen | `/api/campaigns` | |
| Nutzer | `/api/users` | für Zuständigkeiten (`assignedUserId`) |
| Einstellungen | `/api/settings` | |
| Globale Suche | `/api/search?q=...` | |
| Selbstauskunft | `/api/me` | Schlüssel/Rolle prüfen |

Massenaktionen gibt es für die meisten Listen als
`POST /api/<bereich>/bulk-update` bzw. `bulk-delete` mit
`{"ids":[...], "changes":{...}}`.

### Beispiele

```bash
# Offene Leads lesen
curl -s "https://businesssuite.vercel.app/api/leads?status=NEW" \
  -H "Authorization: Bearer DEIN_SCHLUESSEL"

# Lead zuweisen
curl -s -X PATCH https://businesssuite.vercel.app/api/leads/LEAD_ID \
  -H "Authorization: Bearer DEIN_SCHLUESSEL" \
  -H "Content-Type: application/json" \
  -d '{"assignedUserId":"USER_ID"}'

# Notiz als Aktivität festhalten
curl -s -X POST https://businesssuite.vercel.app/api/activities \
  -H "Authorization: Bearer DEIN_SCHLUESSEL" \
  -H "Content-Type: application/json" \
  -d '{"type":"CALL","subject":"Telefonat","body":"Meldet sich nächste Woche","leadId":"LEAD_ID"}'
```

## 5. Rechte und Sicherheit

* Der Schlüssel arbeitet mit **einer festen Rolle** (`BS_API_ROLE`,
  Standard `ADMIN` = Vollzugriff). Über die Rolle lässt sich der Zugriff auf
  einzelne Module einschränken – `GET /api/me` zeigt das Ergebnis.
* **Nur-Lese-Betrieb:** Ist `BS_API_READONLY=true` gesetzt, werden alle
  schreibenden Anfragen mit `403` abgelehnt. Empfohlen, solange nur Daten
  abgeglichen und nicht geändert werden sollen.
* Änderungen werden dem Konto aus `BS_API_USER_EMAIL` zugeschrieben
  (sonst dem ersten aktiven Admin) – so bleibt nachvollziehbar, was über die
  API lief.
* Es sind **echte Kundendaten** (Namen, Adressen, Rechnungen). Der Schlüssel
  ist wie ein Passwort zu behandeln: nicht in Repos, Tickets oder Chats
  ablegen. Bei Verdacht auf Weitergabe in Vercel neu setzen – der alte
  Schlüssel ist damit sofort ungültig.
* Es gibt aktuell **keine Ratenbegrenzung**; bitte in Schleifen eine kurze
  Pause einbauen.

## 6. Einrichtung (einmalig, durch den Betreiber)

In Vercel unter *Settings → Environment Variables* setzen:

| Variable | Pflicht | Bedeutung |
|---|---|---|
| `BS_API_TOKEN` | ja | Der Schlüssel. Mindestens 24 Zeichen, sonst bleibt der Zugang **aus**. |
| `BS_API_ROLE` | nein | Rolle des Zugangs (`ADMIN`, `SALES`, `MARKETING`, `WAREHOUSE`, `ACCOUNTING`). Standard `ADMIN`. |
| `BS_API_READONLY` | nein | `true` = nur lesen. |
| `BS_API_USER_EMAIL` | nein | Konto für die Zuschreibung von Änderungen. |
| `BS_API_ALLOW_QUERY_TOKEN` | nein | `true` = Schlüssel zusätzlich als `?api_key=...` erlauben (immer nur lesend). Nur setzen, wenn ein Werkzeug keine Kopfzeilen unterstützt. |

Schlüssel erzeugen (Terminal):

```bash
openssl rand -base64 32
```

Ohne gesetztes `BS_API_TOKEN` ist der API-Zugang vollständig deaktiviert; die
Suite verhält sich dann exakt wie vorher (nur Login per Cookie).
