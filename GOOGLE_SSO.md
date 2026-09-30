# Google SSO einrichten (Login nur für die eigene Organisation)

Ohne diese Einrichtung läuft die BusinessSuite unverändert mit Passwort-Login
weiter. Erst wenn die vier Variablen unten in Vercel gesetzt sind, schaltet
sich Google-Login frei – und Passwort-Login automatisch ab.

## 1. Google-Cloud-Projekt + OAuth-Client anlegen

1. [console.cloud.google.com](https://console.cloud.google.com) öffnen (mit
   deinem Google-Workspace-Konto, z. B. `sales@sustable.eu`).
2. Falls noch keins vorhanden: neues Projekt anlegen, z. B. "BusinessSuite".
3. Links **APIs & Dienste → OAuth-Zustimmungsbildschirm**:
   - **User Type: Intern** wählen (nicht "Extern"!). Das ist die wichtigste
     Einstellung – Google lässt dann von vornherein nur Konten der eigenen
     Workspace-Domain den Login-Vorgang überhaupt abschließen. Bei "Extern"
     könnte sich theoretisch jeder mit einem Google-Konto anmelden.
   - App-Name (z. B. "Sustable BusinessSuite"), Support-E-Mail ausfüllen,
     Speichern.
4. Links **APIs & Dienste → Anmeldedaten → + Anmeldedaten erstellen →
   OAuth-Client-ID**:
   - Anwendungstyp: **Webanwendung**
   - Autorisierte Redirect-URI eintragen:
     ```
     https://businesssuite.vercel.app/api/auth/google/callback
     ```
   - Erstellen → **Client-ID** und **Client-Secret** notieren (Secret wird
     nur einmal angezeigt).

## 2. In Vercel eintragen

*Settings → Environment Variables* (Production), vier neue Variablen:

| Variable | Wert |
|---|---|
| `GOOGLE_CLIENT_ID` | die Client-ID aus Schritt 1 |
| `GOOGLE_CLIENT_SECRET` | das Client-Secret aus Schritt 1 |
| `GOOGLE_WORKSPACE_DOMAIN` | eure Firmendomäne, z. B. `sustable.eu` |
| `APP_BASE_URL` | `https://businesssuite.vercel.app` |

Speichern löst automatisch ein Redeploy aus.

## 3. Wichtig vor dem ersten Test

Google SSO **legt keine neuen Konten an** – es bestätigt nur die Identität.
Wer sich per Google anmeldet, muss bereits als **aktiver** Nutzer unter
*Einstellungen → Nutzer* in der Suite existieren, mit exakt derselben
E-Mail-Adresse wie das Google-Konto. Bevor ihr testet: kurz prüfen, dass
jede Person, die sich per Google einloggen soll, dort schon eingetragen ist.

## 4. Testen

`https://businesssuite.vercel.app/login` öffnen → "Mit Google anmelden"
klicken → mit einem Konto der eigenen Organisation anmelden. Bei Erfolg
landet man direkt im Dashboard.

Typische Fehlermeldungen auf der Login-Seite:

| Meldung | Ursache |
|---|---|
| "Zugang nur für Mitarbeiter der Organisation" | mit einem Konto außerhalb der Firmendomäne angemeldet |
| "Kein Zugang für diese Adresse…" | Konto existiert (noch) nicht in *Einstellungen → Nutzer* oder ist deaktiviert |
| "Google-Anmeldung fehlgeschlagen" | meist falsche/vertauschte Client-ID/Secret, oder Redirect-URI stimmt nicht exakt überein |

## 5. Notfall-Zugang (Passwort-Login)

Falls Google einmal ausfällt oder ihr vorübergehend zurück zum Passwort-
Login wollt, ohne etwas umzubauen: in Vercel `AUTH_ALLOW_PASSWORD_LOGIN`
auf `true` setzen. Danach erscheint das Passwort-Formular auf der
Login-Seite wieder zusätzlich zum Google-Button. Zurück auf `false` (oder
die Variable löschen) stellt den reinen Google-Login wieder her.
