# Modern Leisure Shopify theme

This is a Shopify theme (based on Sleek v2.x) for the store `modern-leisure-home`, connected through Shopify's GitHub integration:

- `main` → the live (published) theme, "modern-leisure.com". A push to `main` goes live right away.
- `staging` → the dev (draft) theme, "modern-leisure.com/staging". Preview it from Shopify admin (theme ⋯ menu → Preview).

Workflow:
- Always `git pull` before making changes.
- Work on `staging` (or a feature branch off it). Preview locally with `shopify theme dev --store modern-leisure-home`, then push `staging` to update the dev theme.
- Once a change is approved: `git checkout main && git merge staging && git push`.
- Keep `staging` current by merging `main` into it now and then (`git checkout staging && git merge main`), because customizer edits on the live site land in `main`.
- Don't edit `config/settings_data.json` or `templates/*.json` by hand unless asked. The Shopify customizer manages those files and syncs them back to GitHub on its own, so pull before you edit to avoid conflicts. Customizer edits made on the dev theme commit to `staging` and get carried into `main` when you merge.
- Never run `shopify theme push`. The GitHub integration handles deployment.
