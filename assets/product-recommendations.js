if (!customElements.get('product-recommendations')) {
  customElements.define(
    'product-recommendations',
    class ProductRecommendations extends HTMLElement {
      constructor() {
        super();

        if ('requestIdleCallback' in window) {
          requestIdleCallback(this.init.bind(this), { timeout: 1500 });
        } else {
          FoxTheme.Motion.inView(this, this.init.bind(this), { margin: '0px 0px 400px 0px' });
        }
      }

      get isOnCart() {
        return this.dataset.source === 'cart';
      }

      connectedCallback() {
        // On the cart page the recommendations are seeded by the cart's first product, so they go stale
        // when the cart changes: re-seed from the new cart, or hide the section once it is empty.
        if (!this.isOnCart) return;
        this.cartUnsubscriber = FoxTheme.pubsub.subscribe(FoxTheme.pubsub.PUB_SUB_EVENTS.cartUpdate, (state) =>
          this.onCartUpdate(state)
        );
      }

      disconnectedCallback() {
        this.cartUnsubscriber?.();
      }

      onCartUpdate(state) {
        const items = state && state.cart && state.cart.items;
        if (!Array.isArray(items)) return;

        if (!items.length) {
          // Forget the old cart, so adding the same products back counts as a change and refetches.
          this.dataset.exclude = '';
          this.toggleSection(false);
          return;
        }

        const inCart = [...new Set(items.map((item) => item.product_id))];
        const limit = parseInt(this.dataset.limit) || 4;
        const url = new URL(this.dataset.url, window.location.origin);
        url.searchParams.set('product_id', items[0].product_id);
        url.searchParams.set('limit', Math.min(limit + inCart.length, 10));

        const nextUrl = url.pathname + url.search;
        const nextExclude = inCart.join(',');
        // A quantity change leaves the same products in the cart: nothing to refetch.
        if (nextUrl === this.dataset.url && nextExclude === this.dataset.exclude) return;

        this.dataset.url = nextUrl;
        this.dataset.exclude = nextExclude;
        this.init();
      }

      // Hidden rather than removed: on the cart page the section has to be able to come back when the
      // cart gains products again.
      toggleSection(show) {
        this.closest('.shopify-section')?.classList.toggle('hidden', !show);
      }

      // Drop products already in the cart, then keep at most `limit` of what is left; the request asked
      // for extra to leave room for exactly this. Matched by product id: URLs carry translated handles.
      keepForCart(recommendations) {
        const exclude = new Set((this.dataset.exclude || '').split(',').filter(Boolean));
        const limit = parseInt(this.dataset.limit) || Infinity;
        let kept = 0;

        recommendations.querySelectorAll('.products-grid > [data-product-id]').forEach((item) => {
          if (exclude.has(item.dataset.productId) || kept >= limit) {
            item.remove();
          } else {
            kept++;
          }
        });
      }

      init() {
        // The theme editor on an empty cart has no product to seed from; the section shows placeholders.
        if (!new URL(this.dataset.url, window.location.origin).searchParams.get('product_id')) return;

        // Only the latest request may render: cart updates can arrive faster than the responses.
        this.abortController?.abort();
        this.abortController = new AbortController();

        fetch(this.dataset.url, { signal: this.abortController.signal })
          .then((response) => response.text())
          .then((responseText) => {
            const sectionInnerHTML = new DOMParser()
              .parseFromString(responseText, 'text/html')
              .querySelector('.shopify-section');

            if (sectionInnerHTML === null) {
              // An unanswerable request would otherwise leave an empty padded box on the cart page.
              if (this.isOnCart) this.toggleSection(false);
              return;
            }

            const recommendations = sectionInnerHTML.querySelector('product-recommendations');
            if (this.isOnCart && recommendations) this.keepForCart(recommendations);

            if (recommendations && recommendations.innerHTML.trim().length) {
              this.innerHTML = recommendations.innerHTML;
            }

            if (recommendations?.querySelector('.product-card')) {
              if (this.isOnCart) this.toggleSection(true);
              this.dispatchEvent(new CustomEvent('recommendations:loaded'));
            } else {
              if (this.classList.contains('complementary-products')) {
                this.closest('.product__block')?.remove();
              } else if (this.isOnCart) {
                this.toggleSection(false);
              } else {
                this.closest('.shopify-section')?.remove();
              }
              this.dispatchEvent(new CustomEvent('recommendations:empty'));
            }
          })
          .catch((e) => {
            if (e.name !== 'AbortError') console.error(e);
          });
      }
    }
  );
}
