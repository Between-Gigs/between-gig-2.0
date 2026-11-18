# Navigation modes and personal appearance

Baseline: frontend main `109acbca89839157701d2c84a8f79a338354a97b`. This UI change reserves no version and dispatches no release. Email templates, email chooser behavior, Staff permissions and held PRs 56/57 are separate.

## Implemented presentation

Gigster Mode keeps personal profile links. Owner Mode shows Dashboard and Gigsters. Developer Mode shows the full existing workspace navigation for an existing owner session, with Hub as a Developer item. All three choices are available to the current verified superadmin-derived owner session. Choosing a mode never changes a session, membership, role or server guard. The current backend has only `owner` and `gigster` UI roles; its `owner` maps exclusively from Company OS `isSuperAdmin`.

`/owners/developer/` uses the existing OwnerGate and contains a labeled fictional Hub iframe. Live builds do not import the sample Hub component/store. The separate sample export shows the complete Developer directory independently of its fictional identity, which is never a live owner credential. Owner/Team destinations under the `/hub` base path use full-document real-site links and recheck the existing guards; no owner counts or management search are loaded for a fictional non-owner. Its real-account destinations leave the `/hub` base path and retain existing guards. The iframe uses the existing `bg-preview:visitor` session isolation, so fictional role switches cannot replace the parent’s sample identity. Child chrome hides only in a same-origin iframe carrying `data-developer-hub`, inside the exact protected Developer route. Opening the sample alone keeps its own chrome.

The separate verified Hub access security lane owns production `/hub`/`/preview` authorization. This UI source alone does not claim those URLs are secured. Integrate and verify that gate before treating the new developer navigation as a private Hub release.

## My Settings

The existing account menu opens an accessible native-modal My Settings. Theme and Day/Night controls are available there. An opt-in displays both controls in authenticated navigation. Signed-out public visitors retain Day/Night access because they have no account menu.

Preferences are device-local, keyed by normalized signed-in email plus data source (`live` versus `sample`); visitors have a separate identity. They contain only presentation mode, theme, Day/Night, optional wireframe state and navigation-chooser visibility. They are not authority. The original global appearance is captured once before personal changes as the shared legacy migration fallback; an account with no personal choice uses that baseline rather than another account's personal theme. Existing global look/theme keys and sidebar preferences are retained. Unknown/malformed records use supported defaults. Cross-tab storage updates and delayed preference hydration apply through the same scoped record. Personal appearance applies only to the current document and never rewrites legacy global appearance keys; a separate sample account in an iframe cannot change its live parent’s appearance. Explicit valid `?look=` and `?unstyled=1/0` entries take precedence across ordinary client navigation until the corresponding manual choice consumes the entry. Wireframe state follows the same document-local isolation and legacy fallback.

## Staff visibility integration blocker and proposed contract

There is no operative per-user mode-visibility endpoint/store in frontend main. PR57's Access planner remains a proposal; no Apply action or persistence is invented here. Existing role capability APIs are role-wide and must not be repurposed as personal visibility or assumed to grant record access.

Smallest supported configuration proposal, pending tenant-owner review/provisioning:

- A dedicated BG tenant entity `user_interface_visibility`, unrelated to PR56's work records. Fields: `user` (user reference), `visible_modes` (allowlisted presentation values), `revision` (integer). Superadmins retain all modes by default and cannot lose the route to Staff configuration through this setting.
- Subject reads only their own configuration via an own-read permission and row policy `user eq {$me:true}`. Only verified superadmins can write. Existing person/profile/data/API permissions remain unchanged.
- App adapter derives user identity from the verified session; subjects cannot submit arbitrary target IDs for reads. Writes validate fixed tenant/entity/fields, mode allowlist, expected revision and replay identity through supported metadata/query/batch machinery.
- Existing metadata cannot enforce uniqueness of `user`; conflicting duplicate rows must fail closed rather than union visible modes. Define a supported uniqueness strategy before activation. Do not silently choose a row or overload unrelated settings.
- Any normal staff mode can only expose destinations already authorized by the server. Visibility changes do not add role memberships, capabilities or data grants. Current real Hub access remains superadmin-only until a separately reviewed capability contract exists.

No tenant entity, grants, live preferences or staff assignments were written by this lane. A UI-only hidden item is never represented as authorization enforcement.

## Verification and release

The focused browser script `scripts/qa/navigation-modes.mjs` uses fictional contexts only and captures Owner/Developer chrome, the guarded sample wrapper, My Settings at phone/tablet/desktop widths, per-account preference separation, reload and unchanged session authority. Existing navigation/sidebar tests follow the new modes. CI retains captures as `navigation-modes-evidence`.

Two fresh source reviews and browser CI screenshots remain required before merge. The parent coordinates integration with the separate Hub gate, diagnostic/email work and production release. Actual Clerk-account/Company OS persistence and production access are separate acceptance evidence; local static screenshots do not prove them.
