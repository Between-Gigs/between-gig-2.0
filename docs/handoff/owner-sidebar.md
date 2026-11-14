# Owner sidebar

Overview contains Dashboard then Hub. Previews contains Page Previews (the existing Hub page catalogue), Email Previews, Forms and Funnels. Studio contains Design System, Wallpapers and a noninteractive Media Library coming-soon row. The Forms/Funnels pages are read-only indexes into existing fictional sample forms and journeys; they add no live editor, send action or publishing capability.

Each of the five sections has an expanded-state button and controlled content group. Expand all / Collapse all apply to sections independently of the existing whole-rail collapse. Closed section names persist in bg2-owner-nav-sections and are shared between desktop and the mobile drawer. The compact desktop rail retains its labeled icons even when section content is closed. Defaults are expanded. Existing counts, identity, search, sign-out and role/API authorization are retained.

Live dashboard preview links cross with a full navigation into /hub/. Sample builds retain local routes so Next applies Pages or embedded-Hub base paths once. Preview-only routes remain excluded from the live server build. The mobile More action in Swiss opens the same grouped drawer used by the other navigation styles.

QA covers Editorial, Swiss and Modern at 390/1440px in light/dark, section scope and saved preferences, Enter-key operation, 44px controls, expanded/collapsed rails, mobile drawers with a saved rail preference, actual preview destinations, the disabled Media Library row, axe/contrast and horizontal overflow. Fixtures use fresh fictional owner contexts only.
