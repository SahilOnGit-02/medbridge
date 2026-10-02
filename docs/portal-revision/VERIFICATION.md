# Portal revision verification

Verified locally on October 1, 2026. These results cover the prototype flows below; they are not a formal clinical, accessibility or security certification.

## Automated checks

- **93 backend tests passed.** The account lifecycle tests use isolated SQLite databases and temporary private mailboxes. They cover portal-role separation, removal of shared login, case/whitespace handling, signup duplication, email verification, administrator approval and hospital boundaries, patient-profile ownership, empty-profile signup, username recovery, throttling, password reset expiry/single use/portal binding, session invalidation, local-capture production guards, account-email normalization and alphabetical directory order.
- Existing clinical, consent, FHIR, emergency, ingestion, identity and audit tests continue to pass. Dependency deprecation warnings remain.
- Frontend ESLint and production build passed.
- `git diff --check` passed.
- Additive migration `b82a15c30102` applied successfully to the backed-up local PostgreSQL database.

## Browser checks

The main app used the supplied doctor and patient accounts on port 5173. Account enrollment, administrator approval and password-reset tests used temporary app instances on ports 5174/8002 with an isolated synthetic database. Those test accounts do not add profiles or change passwords in the main demonstration database.

| Flow | Observed result |
| --- | --- |
| Doctor login and directory | Correct doctor portal; 100 accessible profiles; names sorted alphabetically with synthetic suffix |
| DOB-only search | `1981-06-15` returned Aarav Sen; date supplied through native input/change events for browser automation |
| Matching dropdown | Typing Aarav returned distinct names with DOB and ID; Down/Enter opened Aarav Sen; Up selected the last suggestion; DOM focus stayed in the input |
| Selected doctor record | Correct patient identity and visible details; search absent; left section links; top profile edit and emergency actions |
| Profile editor | A rejected photo reported partial success and saved profile data remained visible after closing; photo upload embedded in edit; native dialog; Escape closed the dialog and returned focus to the edit button |
| Doctor-home account creation | Patient selector includes DOB/ID; existing linked account gets explanatory recovery guidance; unverified profiles require identity verification |
| Patient profile | Aarav Sen displayed with fictional contact details; top editor saved an equivalent formatted telephone number to its normalized form |
| Long history | 402 entries; timeline initially 25, then 50 after loading another batch; one category open with 10 compact entries; individual medication detail rows initially collapsed |
| Combined filters | Medication category, year 2020 and Metformin text returned 5 matching entries |
| Doctor signup | Mismatched passwords reported without losing input; verification email captured locally; verified account remained blocked pending approval |
| Administrator approval | Hospital administrator approved the synthetic QA application; subsequent doctor login succeeded for the assigned hospital |
| Patient signup | Email verification enabled sign-in to a new empty profile, with no borrowed clinical history |
| Recovery | Username email captured privately; password reset succeeded; reusing the same link showed an explicit invalid/expired/used-link error and new-link action |
| Responsive layouts | Doctor directory and patient records checked at 320 × 900; no document-width overflow in those checked states |
| Browser console | Final loaded pages showed Vite/React development information; no unexpected runtime error in the checked console |

One browser-automation session reset during capture. Its blank-page scan and affected screenshots were replaced after confirming the URL, identity and signed-in state. This did not stop the application servers.

## Accessibility scope

The saved axe results check WCAG 2 A/AA, 2.1 AA and 2.2 AA rules on doctor sign in, doctor record, doctor signup mobile, doctor directory mobile, patient overview, patient category view, patient records mobile and used-link recovery. All saved application scans have zero reported violations. Query tokens are removed from evidence URLs.

Keyboard checks cover the matching dropdown and profile dialog. Manual screen-reader, high-contrast and zoom testing across supported browsers remains outside this verification. The generated decorative account image uses empty alternative text; functional controls have text labels and visible focus.

## Evidence

- [Doctor sign in](evidence/doctor-sign-in.png)
- [Doctor signup](evidence/doctor-signup.png)
- [Doctor directory](evidence/doctor-home.png)
- [Doctor record](evidence/doctor-record.png)
- [Doctor mobile](evidence/doctor-mobile.png)
- [Doctor awaiting approval](evidence/doctor-pending-approval.png), isolated QA account
- [Patient signup](evidence/patient-signup.png)
- [Patient overview](evidence/patient-overview.png)
- [Patient medication category](evidence/patient-category.png)
- [Patient records mobile](evidence/patient-mobile.png)
- [Used reset link](evidence/recovery-used-link.png), isolated QA account

Captured recovery messages, usable tokens, password hashes, database files and local secrets are excluded from Git.
