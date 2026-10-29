# Homepage accessibility and SEO issues

From an audit of the live homepage DOM (modern-leisure.com). Accessibility is measured against WCAG 2.1 AA.

**Top five to fix first:** a meta description and a real title (Allen), make the hero heading the H1 and demote the logo, turn off slideshow autoplay or add a pause control, label the icon-only buttons, fix the orange button contrast (Saderra). Together these cover the most likely legal exposure and the biggest SEO gaps.

---

## Allen: content

> **Already assigned to Allen** as "Home Updates". Everything in this section is covered by that task.

### High priority

- [ ] **Meta description is missing.** Online Store → Preferences → Homepage meta description. The tag isn't on the page at all, so Google pulls random text. This also fixes `og:description`, which right now is just "Modern Leisure" (a copy of the title).
- [ ] **Title tag is just "Modern Leisure" (14 characters).** Online Store → Preferences → Homepage title. Add keywords, e.g. "Modern Leisure | Outdoor Furniture, Grill & Patio Covers".
- [ ] **No social sharing image** (`og:image` / `twitter:image` missing). Online Store → Preferences → Social sharing image. Without it, shares on Facebook, iMessage, Slack, Pinterest, etc. show no preview.

### Medium priority

- [ ] **Thin homepage content.** About 486 visible words, much of it nav and footer. Write a short section about what the company makes, materials, warranty, and who it's for.
- [ ] **Generic link text.** 13 links say "Shop Now" or "Learn more". Reword button labels to say where they go (e.g. "Shop Garrison fire pit covers").

---

## Saderra: accessibility, theme and code

### High priority

- [ ] **Empty H1.** On the homepage the logo is wrapped in the only `<h1>` (`sections/header.liquid:120`), with no text besides the logo image alt. Change it to the same `<div>` used on other pages, and set the first slide's heading tag to H1 in the Slideshow section (keep the others H2). Do both together so the page doesn't end up with two H1s or none.
- [ ] **Hero slideshow autoplays with no way to pause it** (WCAG 2.2.2, which comes up a lot in ADA demand letters). Either turn off **Autoplay** in the Slideshow section, or add a pause/play button to `sections/slideshow.liquid` with an `aria-label` that switches between "Pause slideshow" and "Play slideshow", and pause on hover and focus.
- [ ] **6 icon-only buttons have no accessible name.** The mobile menu button (`menu-drawer-button`), the two `drawer__close` buttons, and `drawer__close-btn`. Add `aria-label`s ("Open menu", "Close") and `aria-hidden="true"` on their SVGs.
- [ ] **Focus outlines removed.** 26 CSS rules set `outline: none` / `outline: 0` on `:focus`. There are 49 `:focus-visible` rules too, so some elements get a replacement style. Tab through the header, product cards and drawers and add a visible focus style anywhere it's missing.
- [ ] **Links with no destination.** 13 `<a>` elements have no `href` or `href="#"`: Facebook, X, Instagram, TikTok, Pinterest and YouTube in the footer, and the "Privacy Policy." link in the newsletter block. They can't be reached by keyboard and are dead text for everyone. Fill in the URLs (Theme settings → Social media; link the privacy policy page in the newsletter block) or remove them. The dead social links also contradict the `sameAs` in the Organization schema.
- [ ] **Orange button contrast is too low.** "Shop Now" and "Shop Equipment Covers" are white on `rgb(229, 82, 4)`, a 3.79:1 ratio. AA needs 4.5:1 at 16px. Darken the button color to about `#C94500` (Theme settings → Colors), or make the button text 19px bold.
- [ ] **White hero text over photos.** Contrast couldn't be measured automatically. Raise each slide's **image overlay opacity** (or add a dark gradient) until the text passes, and check the mobile crops too.

### Medium priority

- [ ] **Slider clones repeat headings.** Every hero and collection H2 shows up three times in the DOM (clones for the infinite loop), so screen readers read "Protect The Spaces You Love" three times and search engines see triplicated H2s. Mark clones `aria-hidden="true"` (plus `inert` so their links can't be tabbed to) and demote or remove their headings.
- [ ] **2 iframes have no `title`** (one from the Shopify CDN, one from our own domain). Find where they come from and add a descriptive `title`.
- [ ] **51 of 105 SVGs** have no `aria-hidden="true"`, role or label. Add `aria-hidden="true"` to the decorative ones. The ones inside the unnamed buttons above matter most.
- [ ] **Unlabeled `<nav>`.** There are two `<nav>` elements and one has no label. Give each an `aria-label` ("Main", "Footer").
- [ ] **Cart drawer skips a heading level.** "Your cart" is an H2, then "Order note", "Estimate Shipping" and "Coupon" are H4s. Change them to H3.
- [ ] **14 images with empty alt**, including the collection card images and the subscription popup image. Collection cards are fine left empty since the card has a text link. Add alt text to anything else that carries meaning.
- [ ] **Product cards link twice.** 8 cards, 16 links: the image and the title both go to the product, so keyboard users tab through each one twice. Set `tabindex="-1"` and `aria-hidden="true"` on the image link, or make the whole card a single link.
- [ ] **"Powered by Shopify" opens a new tab** with no `rel="noopener"` and no warning. Add `rel="noopener"` and visually hidden "(opens in a new tab)" text, or stop opening a new tab.
- [ ] **Structured data is minimal.** Only Organization and WebSite. Add `contactPoint`, `address` and `description` to Organization, `ItemList` / `Product` markup for the homepage featured products, and `BreadcrumbList` on pages with breadcrumbs.
- [ ] **Page weight.** 574 KB of HTML and 30 external scripts, which will show up in Core Web Vitals (LCP and INP). Run PageSpeed Insights, find the heaviest apps, and remove any the store no longer uses.
- [ ] **Hreflang.** Only matters if selling internationally. If US-only, ignore.

---

## Already fine

- **Accessibility:** skip link pointing to `#MainContent`, `lang="en"`, one `<main>`, `<header>` and `<footer>`, no positive tabindex, no duplicate IDs, all 9 form inputs labeled, every image has an `alt` attribute, no text under 12px.
- **SEO:** canonical set to the root URL, viewport tag, no `noindex`, images have width/height and lazy loading, favicon and theme-color present, valid JSON-LD.
