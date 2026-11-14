# Sample authentication previews

When the data source is sample and Clerk is disabled, the shared signup/login frame explains that profiles and sessions are fictional and browser-local. It does not depict a fake Google action. Real-account signup/login links open a separate tab: embedded /hub builds leave the base path for the host's real /join/ and /login/ routes; Pages previews use the real test application. Navigation does not change the sample identity or invoke authentication by itself.

Configured Clerk screens and live API data sources do not show this simulation notice. Provider settings, credentials, Clerk enablement, authentication/consent logic and backend authorization are unchanged. The real links identify account entry, not proof that OAuth succeeds; no live Google sign-in is claimed.

The Gigster journey also shows this explanation and real-entry links on the parent Hub page, outside its inert preview frames. This parent notice remains visible on Clerk-enabled Pages because the passive frames always isolate fictional sessions; the direct Clerk signup/login screens remain unlabeled as sample auth. The parent links are keyboard-accessible, unlike controls shown only inside a passive thumbnail.

Browser QA checks all six looks at phone/desktop widths in both themes: upfront sample copy, exact non-looping real-entry hrefs, keyboard/touch access, no fake Google button or Clerk request, overflow and axe/contrast. Real-account links are inspected rather than followed. The existing isolated Clerk contract asserts that a configured provider is not mislabeled as a simulated sign-in.
