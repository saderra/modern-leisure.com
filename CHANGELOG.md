# Changelog

Changes to the Modern Leisure Shopify theme (modern-leisure.com), newest first. The theme is based on **Sleek** by FoxEcom. See `CLAUDE.md` for the workflow and the list of customizations to keep on every upgrade.

## 2026-10-29: Fixes and audit (staging, not yet on main)

### Changed
- **Mobile breadcrumb hiding moved to section Custom CSS.** Each breadcrumbs section now hides itself on mobile through its own Custom CSS, in every template that uses breadcrumbs (`blog`, `collection`, `collection.banner-right`, `collection.banner-top`, `page.contact`, `page.faq`, `page.find-a-store`, `product`, `product.1-column`, `product.2-columns`, `product.grid-mix`, `product.thumbnail-carousel`). `assets/theme.css` is back to stock, so future Sleek upgrades don't need a CSS edit.

### Fixed
- `sections/ml-product-info.liquid`:
  - Variant fields are now JSON-encoded, so quotes and special characters in variant data no longer break the script.
  - Closed an unclosed list item in the Material list.
  - Removed a leftover `console.log`.
  - Ignores variant changes from other products on the same page (e.g. quick view, recommendations).
- `sections/ml-product-info.liquid` and `sections/ml-alt-images.liquid`: listen for variant changes on the document, and take the starting variant from Liquid instead of the first `.product-variant-id` on the page. Both now show the right variant on first load and stay in sync when it changes.

### Added
- `ISSUES.md`: homepage accessibility (WCAG 2.1 AA) and SEO audit, split into content fixes (Allen) and theme/code fixes (Saderra).

### Docs
- `CLAUDE.md` updated to say breadcrumb hiding lives in section Custom CSS.

## 2026-10-29: Sleek 2.4.0 upgrade (live)

### Changed
- **Theme base upgraded from Sleek 2.1.0 to Sleek 2.4.0.** Started from a fresh stock copy of 2.4.0 from the Theme Store, then carried over the Modern Leisure customizations. Stock changes include updates to the cart drawer, product info and media gallery, slideshow, sticky add-to-cart bar, product recommendations, lookbook, facets, `theme.css`/`theme.js`, and all locale files. 2.4.0 adds `sections/variant-data.liquid`, `snippets/variant-json.liquid` and `assets/featured-blog.js`, and drops `assets/localization-form.js`.

### Kept from the live theme
- Custom product sections `ml-product-info` and `ml-alt-images`, with their CSS and theme-editor labels in `locales/en.default.schema.json`.
- Breadcrumbs hidden on mobile (in `assets/theme.css` at this point; moved to section Custom CSS in the next release).
- Shopify AI-generated blocks: `ai_gen_block_df1f073` (header top bar) and `ai_gen_block_deb1e09` (contact page).
- Section Store app section `ss-grid-pro` (not used in any template).
- All store content and settings: `config/settings_data.json`, `templates/`, `sections/*-group.json`.

### Docs
- `CLAUDE.md` added: branch/theme mapping (`main` = live, `staging` = dev), workflow, list of customizations, and step-by-step Sleek upgrade instructions.

## 2026-10-29: Snapshot of the live theme (Sleek 2.1.0)

- Pulled the live theme into the repo as the starting point. The repo had held a Sleek 2.2.0 merge, but the live store was still running **2.1.0**, so this commit brought the repo back in line with what was actually live, including content and settings edits made in the customizer since March (homepage, product, cart, collection, about and contact templates; footer and overlay groups).

## 2026-03-31: Original build (Aneurin Barker Snook)

- **Sleek 2.1.0, customized for Modern Leisure.** The theme that went live. Customizations:
  - `sections/ml-product-info.liquid` and `assets/component-ml-product-info.css`: product info section with bullet points and specifications from product metafields, plus UPC, color, material and size from variant metafields, updated when the variant changes.
  - `sections/ml-alt-images.liquid` and `assets/ml-alt-images.css`: alternate images from each variant's `custom.alternative_images` metafield, switched when the variant changes.
  - Theme-editor labels for both sections.
  - Breadcrumbs hidden on mobile in `assets/theme.css`.
  - Shopify AI-generated blocks for the header top bar and contact page.
  - Section Store `ss-grid-pro` section.
- **Sleek 2.2.0** committed on a `v2` branch and merged in. This version was never published to the live store.
