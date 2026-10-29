# Modern Leisure Shopify theme

Shopify theme for the store `modern-leisure-home` (modern-leisure.com), based on **Sleek 2.4.0** by FoxEcom. The store is connected to this repo through Shopify's GitHub integration, and these are the only two themes on the store:

| Branch | Shopify theme | Role | Theme ID |
|---|---|---|---|
| `main` | modern-leisure.com | Live (published). A push to `main` goes live right away. | 149693530200 |
| `staging` | modern-leisure.com/staging | Dev (draft). Preview it from Shopify admin (theme ⋯ menu → Preview). | 187725807704 |

## Workflow

- Always `git pull` before making changes. Customizer edits commit to the branch on their own.
- Work on `staging` (or a feature branch off it). Preview locally with `shopify theme dev --store modern-leisure-home`, or push `staging` and preview the dev theme.
- Once a change is approved: `git checkout main && git pull && git merge staging && git push`.
- Keep `staging` current by merging `main` into it now and then (`git checkout staging && git merge main`), because customizer edits on the live site land in `main`.
- Don't edit `config/settings_data.json`, `templates/*.json` or `sections/*-group.json` by hand unless asked. The Shopify customizer manages them. Customizer edits made on the dev theme commit to `staging` and get carried into `main` when you merge.
- Never run `shopify theme push`. The GitHub integration handles deployment. To confirm a push synced, pull one file from the theme ID above (e.g. `shopify theme pull --store modern-leisure-home --theme <id> --path <scratch dir> --only config/settings_schema.json`) and check `theme_version`. Syncing takes up to about a minute.

## Customizations on top of stock Sleek

Carry these over on every Sleek upgrade. Everything else matches stock Sleek.

- `sections/ml-product-info.liquid`, `sections/ml-alt-images.liquid`, `assets/component-ml-product-info.css`, `assets/ml-alt-images.css`: custom product sections by the original developer (Aneurin Barker Snook), used in `templates/product.json`.
- `locales/en.default.schema.json`: theme-editor labels for those two sections (`sections.ml-alt-images`, `sections.ml-product-info`). Other locales don't have them, which causes theme check `MatchingTranslations` errors. That's expected.
- Breadcrumbs hidden on mobile: done with each breadcrumbs section's Custom CSS (`custom_css` in the templates), not in `assets/theme.css`, so it carries over with the content JSON. Add the same rule to any new template that uses breadcrumbs.
- Faint product card border on collection pages: also section Custom CSS, on the `main-collection-product-grid` section in each `templates/collection*.json`.
- `blocks/ai_gen_block_df1f073.liquid` (header top bar) and `blocks/ai_gen_block_deb1e09.liquid` (contact page): Shopify AI-generated blocks, inside Shopify's built-in `_blocks` section type.
- `sections/ss-grid-pro.liquid`: a Section Store app section. Not used in any template right now.

## Upgrading Sleek

1. In Shopify admin, add a fresh copy of the new Sleek version from the Theme Store as a draft. Don't use "Update" on the live theme.
2. Pull it into a scratch folder outside the repo: `shopify theme list --store modern-leisure-home`, then `shopify theme pull --store modern-leisure-home --theme <id> --path <scratch dir>`. Confirm `theme_version` in `config/settings_schema.json`.
3. On `staging`: `rsync -a --delete` the stock files into the repo, excluding `.git` and `CLAUDE.md`. Then restore the content JSON (`config/settings_data.json`, `templates/`, `sections/*-group.json`) and the custom files above from git, and reapply the locale label edits.
4. Check that every section, block and setting the templates use still exists in the new schemas. Run `shopify theme check` on both the repo and the stock copy, and compare the results so you only look at new issues.
5. Commit and push `staging`, preview it (cart drawer, product page, breadcrumbs on mobile), then merge into `main`. Delete the stock draft in Shopify afterwards.
