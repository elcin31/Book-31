# FOLIO development

Work only within this repository. Preserve the offline SQLite database and existing features.

## Mobile design skill

For mobile design, implementation, or review, read `.agents/skills/mobile-design/SKILL.md` and the relevant files in its `references/` directory. The skill is repository-local; no installer or runtime dependency is required. Follow its accessibility, Android touch target, state completeness, and platform guidance.

Run `npm run typecheck`, `npm test`, and `npm run export:android` for application changes. Native install verification uses `.github/workflows/android.yml`. Never claim update signing compatibility without comparing certificates; never suggest uninstalling an existing installation containing unexported reading data.
