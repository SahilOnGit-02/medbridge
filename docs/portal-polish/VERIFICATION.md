# Portal refinements and verification

Date: 2026-10-04. Local changes on `codex/medbridge-finalization`, reviewed through PR #4. Main's production API URL update `d665b4b` is integrated. Production deployment and merge have not been performed.

## Resulting flows

- Portal chooser: sign-in and secondary sign-up buttons side by side; 36px separation between portal cards on desktop, 28px on narrow screens. Buttons and navigation controls are underlined only on hover, with keyboard focus outlines retained.
- Both signup forms: first/last name, Email address, one password field and an accessible eye control. Patient DOB remains. Doctor registration number and organization remain required for administrator review. New signup uses email as the identifier; older usernames are still supported.
- New registrations move to a dedicated six-digit verification screen. Resend is below the primary Verify email action, disabled for 90 seconds, with a visible countdown. The server enforces the interval, limits wrong guesses to five, expires codes after ten minutes, binds them to the portal, and consumes them once. A resend replaces prior codes and links. Verification links remain supported for existing clients.
- Existing active accounts sign in directly, as requested. Pending doctor accounts require administrator approval after email verification. Forgot password is adjacent to Password; account creation is a separate secondary action below sign-in; username recovery and verification help are lower-priority links to separate pages.
- Doctor Home emphasizes search by name, DOB or ID with keyboard-operable matching suggestions. Recently opened and Patient directory are separate routes, not sections on Home. Opened records have separate Overview, Record history and Medical reports routes. Sidebar entries navigate to pages. Connected providers navigation/card is absent on the doctor side; patient Sharing remains available.
- Create patient account opens a new details form. Optional contact fields use progressive disclosure. Enrollment checks the clinician's hospital assignment and identity-check confirmation, creates an empty profile/account/mapping, and requires patient email verification. It does not create consent or claim another profile. The old manual account-linking API remains documented separately.
- One highlighted patient card contains identity/contact information, editing, emergency access and a brief summary drawn from available data. Doctor Edit patient profile is a pencil/tertiary control; Emergency access is primary. Doctor identity/account changes are rejected by the profile API. Limited contact/emergency edits and photo updates remain supported. Patients retain their own profile editing.
- Report rows have 24px padding and separation, with right-aligned Open report/Open prescription actions. Secure file retrieval opens a PDF.js preview dialog with zoom, page navigation, extracted text and explicit new-tab/save controls. The viewer loads only when a file is opened. Preview URLs are revoked on closure/unmount. Report reads continue to re-check consent.

## Verification

- 141 backend tests passed, including code expiry, wrong-guess limits, single use, portal binding, superseded links, server resend cooldown, preserved direct login, approval, doctor edit restrictions and enrollment without consent.
- Frontend lint and production build passed. Generated API/database references and the tracked-file heuristic secret check passed. This check does not establish a full history/security audit.
- Browser checks covered both signup forms, new patient code verification with pasted spaces, doctor code verification/approval feedback, resend availability after 90 seconds and reset after resend, existing doctor/patient login, keyboard suggestion selection, dedicated recent/directory/history/report navigation, creation and restricted edit forms, report/prescription rendering, two-page navigation, 300% zoom, keyboard access to extracted page text, and narrow-screen reflow.
- Button hover was checked: underline while hovered, none when the pointer leaves. Desktop and 320px layouts were inspected. DOB setup in the registration browser test used a DOM input event because the automation adapter did not fill the native date widget; normal date-widget keyboard entry was not established by that check.
- Scoped accessibility scans use WCAG 2 A/AA, 2.1 AA and 2.2 AA tags. Results are in the evidence folder. All seven scans reported zero violations and zero incomplete checks. Solid image-caption backgrounds remove the initial gradient contrast checks; preview heading wrapping was inspected separately. The PDF.js viewer renders the page with zoom/page controls and a separate extracted-text option. The original PDF document structure is outside these HTML scans, and no formal accessibility certification or user testing is claimed.

## Local data and service boundaries

The local database was backed up before migration. Migration head is `c91a2b8f4d03`. Its existing data remains: 100 patients, 3,637 visits, 747 conditions, 199 allergies, 3,637 prescriptions and 7,274 observations. All 100 names end in `(synthetic)` and are ordered alphabetically by the directory API. No duplicate population was necessary. Existing two sign-in accounts remain unchanged. The linked patient has 96 visits and a long history.

Account emails remain privately captured locally, as requested. Production inbox delivery still requires the deferred provider/sender/URL configuration. The main local database contains zero PDF report rows; populated report checks used a separate SQLite test database with 15 clearly labeled report fixtures. These fixtures and registration test accounts were not added to the main local database. Bundled example PDFs were used to test retrieval/preview, not represented as authentic patient prescriptions.

Deploy the backend migration and code together before releasing the matching frontend. Preview hosting alone does not deploy the new backend account/report endpoints.

## Concrete UX references

- [GOV.UK email confirmation](https://design-system.service.gov.uk/patterns/confirm-an-email-address/): dedicated verification step, clear next action, expiry and resend help. Email verification confirms inbox access, not clinical identity.
- [GOV.UK buttons](https://design-system.service.gov.uk/components/button/): a clear main action and lower-weight secondary choices.
- [GOV.UK password input](https://design-system.service.gov.uk/components/password-input/): password-manager autocomplete, paste support, clear requirements and a show/hide control. The icon treatment is specific to this interface.

These informed the layout choices; they do not establish usability outcomes for MedBridge.
