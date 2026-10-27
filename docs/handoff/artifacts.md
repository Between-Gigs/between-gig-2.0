# Shared artifacts

Static copies of the pages shared from Claude during the 2.0 build, served with the preview from `public/artifacts/`:

| Page | Live | Source |
| --- | --- | --- |
| Index | [/artifacts/](https://between-gigs.github.io/between-gig-2.0/artifacts/) | `public/artifacts/index.html` |
| Build map (3D) | [/artifacts/build-map/](https://between-gigs.github.io/between-gig-2.0/artifacts/build-map/) | `public/artifacts/build-map/` |
| Backend handoff | [/artifacts/backend-handoff/](https://between-gigs.github.io/between-gig-2.0/artifacts/backend-handoff/) | `public/artifacts/backend-handoff/` |
| Design system showcase | [/artifacts/showcase/](https://between-gigs.github.io/between-gig-2.0/artifacts/showcase/) | `public/artifacts/showcase/` |
| Prototype | [/artifacts/showcase/app/](https://between-gigs.github.io/between-gig-2.0/artifacts/showcase/app/) | `public/artifacts/showcase/app/` |

They are snapshots: plain HTML with their images, loading three.js, React and Mermaid from public CDNs. They are not built by Next and are excluded from lint. The build map's stack images come from `node scripts/studio-stack.mjs`.
