# Publish gate (Q1): "Approved, not yet public"

`NEXT_PUBLIC_PROFILE_PUBLISH_GATE=1` (deploy variable `PROFILE_PUBLISH_GATE`) switches the wording and visibility rules to the API's publish gate (API 1.16.0, profiles module 1.9.0, option `publish_after_approval`). Default OFF: every screen reads and behaves as before.

- Status `published` is added. With the gate on, `approved` is private and only `published` is public ("Live").
- Gigster: approved reads "Approved, not yet public" with the line "The Between Gigs team approved your profile. It goes public when we launch the directory." and "Changes you make here go back to the team for review." No email on approval.
- Owner: Approve stays "Approve"; approved people read "Approved, not public"; "Live profiles" counts published only; an "Approved" count is added. No publish button yet (the bulk publish screen is the next phase).
- Public pages and the public list render only public statuses (`lib/profile/publish-gate.ts`).
- Activation: `company-os.json` `profileFeatures.publishGate` (API release >=1.16.0, profiles 1.9.0, commit and settings receipt) is checked by `scripts/check-profile-activation.mjs`.
- Funnel stage "Approved" counts approved plus published; its list link shows approved only.
