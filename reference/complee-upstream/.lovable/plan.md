# Complee Full Roadmap — "Pennylane für FinTech-Compliance"

## 🎯 Vision
Die FinTech-Company stellt mit Complee zu 90% automatisiert ihr komplettes Authorisation-Pack zusammen. Externe Anwälte / Compliance-Experten loggen sich in einem **eigenen Reviewer-Portal** ein, sehen alle Dokumente an einem Ort, kommentieren, ändern direkt im PDF und approven am Ende mit einem Klick. Die FinTech bekommt ein finalisiertes, regulator-ready Pack zurück.

---

## 📊 Aktueller Stand (Stärken, auf denen wir aufbauen)
- ✅ Cross-Border Gap-Analyse (FCA, BaFin, ACPR, DNB, BdE)
- ✅ Workspaces (mehrere parallele Authorisation-Packages)
- ✅ Inline-Signaturen mit Anchor-Metadaten + Hash
- ✅ Document Library + AI-Assistent + Cloud-Sync
- ✅ Supabase RLS, Storage Bucket `documents`, `signed_documents`-Tabelle

---

## 🚀 Roadmap — 4 Phasen

### **Phase 1 — Reviewer-Portal (das "Pennylane-Auditor"-Erlebnis)**
> Der wichtigste Wedge. Ohne das ist Complee nur ein Dokumenten-Generator.

**1.1 Rollen-System**
- Neue Tabelle `user_roles` (enum: `fintech_owner`, `reviewer`, `admin`) mit Security-Definer-Funktion `has_role()` (separate Tabelle, keine Speicherung auf `profiles`).
- Neue Tabelle `workspace_reviewers`: `assessment_id`, `reviewer_user_id`, `invited_email`, `status` (pending/active/revoked), `permissions` (read/comment/edit/approve).
- Migration + RLS-Policies, sodass Reviewer nur Workspaces sehen, zu denen sie eingeladen wurden.

**1.2 Reviewer-Einladungsflow**
- Im Workspace-Switcher: "Invite reviewer" → E-Mail eingeben → Zugriffslevel wählen.
- E-Mail mit Magic-Link (Lovable Cloud Auth) → Reviewer landet direkt im Reviewer-Portal.
- Owner-View zeigt Status: "2 reviewers active, 1 pending".

**1.3 Reviewer-Portal (`/review`)**
- Eigenes Layout: linke Sidebar = alle eingeladenen FinTech-Workspaces, mittig = Dokumentenliste mit Status-Pills (Draft / Awaiting review / Changes requested / Approved), rechts = PDF-Viewer mit Comment-Layer.
- Filter: "Needs my approval" / "All documents" / "By regulator".
- "Bulk approve"-Button für mehrere Dokumente gleichzeitig.

**1.4 Comment- & Change-Request-Layer**
- Neue Tabelle `document_comments`: `signed_document_id`, `author_user_id`, `page`, `x`, `y`, `body`, `resolved_at`.
- Reviewer klickt auf eine Stelle im PDF → Kommentar-Pin → FinTech sieht es im eigenen Doc-Viewer als roten Pin.
- "Request changes"-Button auf Dokument-Ebene → Status springt zurück auf Draft, FinTech bekommt Notification.

**1.5 Approval-Workflow**
- Reviewer klickt "Approve" → schreibt eigene Signatur (gleicher Pad wie FinTech) → wird als zweite Signatur unter die FinTech-Signatur gestempelt.
- Audit-Trail dokumentiert: Wer hat wann was approved.

---

### **Phase 2 — Trust & Submission-Readiness**
> Macht aus "AI-generierten PDFs" → "regulator-ready Pack".

**2.1 Manipulationssicherer Audit-Trail**
- Neue Tabelle `audit_events`: `assessment_id`, `actor_user_id`, `event_type` (document_generated / signed / commented / approved / changes_requested / pack_exported), `payload jsonb`, `prev_hash`, `event_hash`.
- Hash-Chain: jedes Event hashed `prev_hash + payload + timestamp` → fälschungssicheres Ledger.
- Im UI: "View audit trail" pro Dokument und pro Workspace → zeigt komplette Timeline.

**2.2 Verstärkte E-Signatur**
- E-Mail-Verifizierung des Signers vor Signatur (OTP an Login-E-Mail) → erfüllt eIDAS "Advanced Electronic Signature"-Anforderungen.
- Capture: IP, User-Agent, Geo (via header), Timestamp aus Server (nicht Client) → in `signed_documents` (Felder existieren teilweise schon).
- Append PDF/A-konformes Certificate als letzte Seite mit Hash, Signer-Identität, Verification-URL (`/verify/$hash`).

**2.3 Submission-Pack-Export**
- Neuer Button im Workspace: "Generate submission pack".
- Erstellt ZIP mit:
  - `00_cover_letter.pdf` (auto-generiert, regulator-spezifisch im FCA/BaFin/ACPR-Format)
  - `01_application_form.pdf` (vorausgefüllt)
  - `02_documents/` (alle signierten + reviewer-approved PDFs)
  - `03_audit_trail.pdf` (komplette Hash-Chain als PDF)
  - `04_checklist.pdf` (Regulator-spezifische Pflicht-Doc-Checkliste mit Häkchen)
- Pre-Flight-Validator: Prüft VOR Export, ob alle Pflichtfelder gefüllt, alle Pflicht-Docs signiert, mindestens 1 Reviewer-Approval — sonst rote Liste mit "Missing X".

---

### **Phase 3 — Eigenen Dokumenten-Upload + AI-Check**
> Verbindet Complee mit der CompliancePilot-Logik aus Feature 1.

**3.1 Upload-Flow für bestehende Policies**
- In jedem Step: "Have an existing policy? Upload it."
- File geht in `documents`-Bucket, neuer Eintrag in `signed_documents` mit `doc_type='uploaded'`.
- Mit `document--parse_document` Server-Function → extrahiert Text + Tabellen.

**3.2 AI-Coverage-Check (Server-Function)**
- Neue Server-Function `analyzeUploadedDocument` mit Lovable AI (`google/gemini-2.5-pro`).
- Input: extrahierter Text + Substep-Liste des aktuellen Requirements.
- Output (JSON, schema-validated): pro Substep `status: covered|partial|missing`, `evidence_quote`, `gap_explanation`, `suggested_addition`.
- UI zeigt: "Ihr SCA Policy deckt 7 von 10 Substeps ab — fehlt: Payee Name Verification". Direkt mit "Generate addendum"-Button → AI ergänzt das fehlende Stück als anhängbares PDF.

**3.3 Verschmelzen statt doppelt**
- Wenn User upload, zeigen wir "Use uploaded version" oder "Use Complee-generated version" oder "Merge: keep yours, add missing parts" — Pennylane-style: User-Wissen first, AI füllt Lücken.

---

### **Phase 4 — Regulator-Watch + Live-Updates**
> Macht Complee zu wiederkehrendem Wert (nicht One-Shot-Tool).

**4.1 Regulator-Watch-Tabelle**
- Neue Tabelle `regulatory_updates`: `regulator`, `requirement_id`, `change_type` (new/amended/repealed), `effective_date`, `summary`, `source_url`, `published_at`.
- Cron-fähige Server-Route `/api/public/sync-regulator-feeds` (mit Webhook-Secret) — pulled aus FCA Handbook RSS, BaFin Mitteilungen, EBA Public Register etc.

**4.2 Impact-Analyse pro Workspace**
- Wenn neue Regulation reinkommt, AI-Diff: Welche User-Workspaces sind affected? (Match auf `target_country` + `institution_type`).
- Notification im Dashboard: "🚨 FCA changed CASS 15 reconciliation requirements — 3 of your documents need updating."
- 1-Klick: "Re-generate affected documents" → neue Versionen, alte werden als historical archiviert (nicht überschrieben).

**4.3 Versionierung**
- `signed_documents` bekommt `version`, `superseded_by_id`, `superseded_at` Felder.
- Document-Viewer zeigt Versions-Selector: "v1 (signed Jan 2026) / v2 (signed Apr 2026 — current)".

---

## 🎁 Bonus — Onboarding-Polish (in Phase 1 mitliefern)

- **Demo-Workspace** auf erstem Login: "FlowPay → UK passporting" mit Beispieldaten, damit User sofort den Wert sieht ohne tippen zu müssen.
- **Dashboard-Homepage** statt direkt Profile-Form: Zeigt alle Workspaces als Karten mit Readiness-Score, geschätzte Zeit-Ersparnis ("Saved you 14 weeks of legal work"), nächste fällige Tasks.
- **Cost-Saving-Anzeige** pro Workspace: "Estimated alternative cost: £45,000 — Complee cost: £0 / your plan."

---

## 📦 Implementierungs-Reihenfolge (was zuerst?)

1. **Phase 1 (Reviewer-Portal)** — größter VC-Pitch-Mehrwert, differenziert von jedem Konkurrenten.
2. **Phase 2 (Audit-Trail + Submission-Pack)** — macht das Output verkaufbar an konservative FinTechs.
3. **Phase 3 (Upload + AI-Check)** — verbindet Wissen der FinTech mit Complee, bringt User echtes "Aha".
4. **Phase 4 (Regulator-Watch)** — Subscription-Anker, sorgt für wiederkehrenden Login.

---

## 🛠 Tech-Notizen
- Alle DB-Änderungen via Migration-Tool, RLS-Policies enforce Rolle (Owner sieht nur eigene, Reviewer nur eingeladene Workspaces).
- AI-Calls über Lovable AI Gateway (`google/gemini-2.5-pro` für Doc-Analyse, `google/gemini-2.5-flash` für Comments/Suggestions).
- E-Mail-Versand via Resend-Connector (für Reviewer-Einladungen + Notifications).
- Hash-Chain in `audit_events` mit SHA-256 (Web Crypto API in Server-Function).
- ZIP-Generierung in Server-Function mit `jszip` (Worker-kompatibel).

---

Soll ich mit **Phase 1 (Reviewer-Portal)** starten, sobald du den Plan freigibst? Wir können die Phasen einzeln in eigenen Sprints bauen, sodass du nach jeder Phase einen funktionierenden, deploybaren Stand hast.