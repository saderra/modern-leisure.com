if (!customElements.get('product-info')) {
  customElements.define(
    'product-info',
    class ProductInfo extends HTMLElement {
      abortController = undefined;
      onVariantChangeUnsubscriber = undefined;
      pendingRequestUrl = null;
      preProcessHtmlCallbacks = [];
      postProcessHtmlCallbacks = [];
      cartUpdateUnsubscriber = undefined;
      cachedVariants = null;
      cachedVariantsSource = null;
      variantDataAbortController = undefined;
      variantDataToken = null;

      constructor() {
        super();
      }

      get variantSelectors() {
        return this.querySelector('variant-selects');
      }

      get productId() {
        return this.getAttribute('data-product-id');
      }

      get sectionId() {
        return this.dataset.originalSection || this.dataset.section;
      }

      get pickupAvailability() {
        return this.querySelector(`pickup-availability`);
      }

      get productForm() {
        return this.querySelector('form[is="product-form"]');
      }

      get quantityInput() {
        return this.querySelector('quantity-input input');
      }

      connectedCallback() {
        this.initializeProductSwapUtility();

        this.onVariantChangeUnsubscriber = FoxTheme.pubsub.subscribe(
          FoxTheme.pubsub.PUB_SUB_EVENTS.optionValueSelectionChange,
          this.handleOptionValueChange.bind(this)
        );

        this.initQuantityHandlers();

        this.currentVariant = this.getSelectedVariant(this);
        if (this.currentVariant) {
          this.updateMedia(this.currentVariant);
        }
      }

      disconnectedCallback() {
        this.onVariantChangeUnsubscriber();
        this.cartUpdateUnsubscriber?.();
        this.variantDataAbortController?.abort();
      }

      initializeProductSwapUtility() {
        this.postProcessHtmlCallbacks.push((newNode) => {
          window?.Shopify?.PaymentButton?.init();
          window?.ProductModel?.loadShopifyXR();
        });
      }

      handleOptionValueChange({ data: { event, target, selectedOptionValues } }) {
        if (!this.contains(event.target)) return;

        const productUrl = target.dataset.productUrl || this.pendingRequestUrl || this.dataset.url;
        const shouldSwapProduct = this.dataset.url !== productUrl;
        const shouldFetchFullPage = this.dataset.updateUrl === 'true' && shouldSwapProduct;
        const viewMode = this.dataset.viewMode || 'main-product';

        // Answer the click with what the variant JSON already knows, then let the fetch below settle
        // the rest. A cache miss — combined listing, impossible combination, product too large to
        // cache — falls back to the pending state this always had.
        const optimisticVariant = shouldSwapProduct ? null : this.getVariantFromCache();
        if (optimisticVariant) {
          this.applyOptimisticUpdate(optimisticVariant);
        } else {
          this.disableButtons();
          if (!shouldSwapProduct) this.fetchVariantData(productUrl, selectedOptionValues);
        }

        this.renderProductInfo({
          requestUrl: this.buildRequestUrlWithParams(productUrl, selectedOptionValues, shouldFetchFullPage),
          targetId: target.id,
          callback: shouldSwapProduct
            ? this.handleSwapProduct(productUrl, shouldFetchFullPage, viewMode)
            : this.handleUpdateProductInfo(productUrl, viewMode),
        });
      }

      handleSwapProduct(productUrl, updateFullPage, viewMode) {
        return (html) => {
          const quickView = html.querySelector('#MainProduct-quick-view__content');
          if (quickView && viewMode === 'quick-view') {
            html = quickView.content.cloneNode(true);
          }
          const selector = updateFullPage ? "product-info[id^='MainProduct']" : 'product-info';
          const variant = this.getSelectedVariant(html.querySelector(selector));

          this.updateURL(productUrl, variant?.id);

          if (updateFullPage) {
            document.querySelector('head title').innerHTML = html.querySelector('head title').innerHTML;
            HTMLUpdateUtility.viewTransition(
              document.querySelector('main'),
              html.querySelector('main'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
            HTMLUpdateUtility.viewTransition(
              document.getElementById('shopify-section-sticky-atc-bar'),
              html.getElementById('shopify-section-sticky-atc-bar'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );

            if (!variant) {
              this.setUnavailable();
              return;
            }
          } else {
            HTMLUpdateUtility.viewTransition(
              this,
              html.querySelector('product-info'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          }

          this.currentVariant = variant;
        };
      }

      handleUpdateProductInfo(productUrl, viewMode) {
        return (html) => {
          const quickView = html.querySelector('#MainProduct-quick-view__content');
          if (quickView && viewMode === 'quick-view') {
            html = quickView.content.cloneNode(true);
          }
          const variant = this.getSelectedVariant(html);

          this.pickupAvailability?.update(variant);
          this.updateOptionValues(html);
          this.updateURL(productUrl, variant?.id);
          this.updateShareUrl(variant?.id);
          this.updateVariantInputs(variant?.id);

          if (!variant) {
            this.setUnavailable();
            return;
          }

          this.updateMedia(variant);

          const updateSourceFromDestination = (id, shouldHide = (source) => false) => {
            const source = html.getElementById(`${id}-${this.sectionId}`);
            const destination = this.querySelector(`#${id}-${this.dataset.section}`);
            if (source && destination) {
              destination.innerHTML = source.innerHTML;
              destination.classList.toggle('hidden', shouldHide(source));
            }
          };

          updateSourceFromDestination('price');
          updateSourceFromDestination('Sku');
          updateSourceFromDestination('Inventory');
          updateSourceFromDestination('Badges');
          updateSourceFromDestination('PricePerItem');
          updateSourceFromDestination('Volume');

          this.updateQuantityRules(this.sectionId, this.productId, html);
          updateSourceFromDestination('QuantityRules');
          updateSourceFromDestination('VolumeNote');

          HTMLUpdateUtility.viewTransition(
            document.querySelector(`#SizeChart-${this.sectionId}`),
            html.querySelector(`#SizeChart-${this.sectionId}`),
            this.preProcessHtmlCallbacks,
            this.postProcessHtmlCallbacks
          );

          const stickyAtcBar = document.getElementById(`shopify-section-sticky-atc-bar`);
          if (stickyAtcBar) {
            stickyAtcBar.classList.remove('hidden');
          }

          const newAddButton = html.getElementById(`ProductSubmitButton-${this.sectionId}`);
          const isDisabled = !newAddButton || newAddButton.hasAttribute('disabled');
          this.updateButtonsState(isDisabled, {
            updateText: true,
            text: isDisabled ? FoxTheme.variantStrings.soldOut : null,
          });

          FoxTheme.pubsub.publish(FoxTheme.pubsub.PUB_SUB_EVENTS.variantChange, {
            data: {
              sectionId: this.sectionId,
              html,
              variant,
            },
          });

          document.dispatchEvent(
            new CustomEvent('variant:changed', {
              detail: {
                variant: variant,
              },
            })
          );
        };
      }

      buildRequestUrlWithParams(url, optionValues, shouldFetchFullPage = false) {
        const params = [];

        !shouldFetchFullPage && params.push(`section_id=${this.sectionId}`);

        // A combined-listing value's product_url can already pin a variant (`?variant=`): Shopify adds it
        // when the current selection does not exist on that product, so it must win over option_values.
        const pinsVariant = url.includes('variant=');
        if (optionValues.length && !pinsVariant) {
          params.push(`option_values=${optionValues.join(',')}`);
        }

        return `${url}${url.includes('?') ? '&' : '?'}${params.join('&')}`;
      }

      getSelectedVariant(productInfoNode) {
        const selectedVariant = productInfoNode.querySelector('variant-selects [data-selected-variant]')?.innerHTML;
        return !!selectedVariant ? JSON.parse(selectedVariant) : null;
      }

      renderProductInfo({ requestUrl, targetId, callback }) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        fetch(requestUrl, { signal: this.abortController.signal })
          .then((response) => response.text())
          .then((responseText) => {
            this.pendingRequestUrl = null;
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            callback(html);
          })
          .then(() => {
            // set focus to last clicked option value
            document.querySelector(`#${targetId}`)?.focus();
          })
          .catch((error) => {
            if (error.name === 'AbortError') {
              console.log('Fetch aborted by user');
            } else {
              console.error(error);
            }
          });
      }

      updateOptionValues(html) {
        const variantSelects = html.querySelector('variant-selects');
        if (variantSelects) {
          HTMLUpdateUtility.viewTransition(this.variantSelectors, variantSelects, this.preProcessHtmlCallbacks);
        }
      }

      updateURL(url, variantId) {
        if (this.dataset.updateUrl === 'false') return;
        window.history.replaceState({}, '', `${url.split('?')[0]}${variantId ? `?variant=${variantId}` : ''}`);
      }

      updateVariantInputs(variantId) {
        document
          .querySelectorAll(`#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`)
          .forEach((productForm) => {
            const input = productForm.querySelector('input[name="id"]');
            input.value = variantId ?? '';
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
      }

      updateMedia(variant) {
        const productMedia = this.querySelector(`[id^="MediaGallery-${this.dataset.section}"]`);
        if (!productMedia) return; // Early return if productMedia is not found

        const setActiveMedia = () => {
          if (typeof productMedia.setActiveMedia === 'function') {
            productMedia.init();
            productMedia.setActiveMedia(variant);
            return true; // Indicate success
          }
          return false; // Indicate failure
        };

        if (!setActiveMedia()) {
          this.timer = setInterval(() => {
            if (setActiveMedia()) {
              clearInterval(this.timer);
            }
          }, 100);
        }
      }

      updateShareUrl(variantId) {
        if (!variantId) return;
        const shareButton = document.getElementById(`ProductShare-${this.dataset.section}`);
        if (!shareButton || !shareButton.updateUrl) return;
        shareButton.updateUrl(`${window.shopUrl}${this.dataset.url}?variant=${variantId}`);
      }

      updateButtonsState(disabled, options = {}) {
        const { updateText = false, text = null, updateStyles = true } = options;

        // Handle main add button in product form
        const productForm = document.getElementById(`product-form-${this.dataset.section}`);
        if (productForm) {
          const addButton = productForm.querySelector('[name="add"]');
          const addButtonText = productForm.querySelector('[name="add"] > span');

          if (addButton) {
            if (disabled) {
              addButton.setAttribute('disabled', 'disabled');
              if (updateText && text && addButtonText) {
                addButtonText.textContent = this.decoded(text);
              }
            } else {
              const variantId = productForm.querySelector('[name="id"]')?.value;
              if (variantId) {
                addButton.removeAttribute('disabled');
                if (updateText && addButtonText) {
                  addButtonText.textContent = this.decoded(FoxTheme.variantStrings.addToCart);
                }
              }
            }

            if (updateStyles) {
              addButton.style.pointerEvents = disabled ? 'none' : '';
              addButton.style.opacity = disabled ? '0.6' : '';
            }
          }
        }

        // Handle sticky ATC button
        const otherButtonSelectors = ['.sticky-atc-bar [name="add"]'];
        otherButtonSelectors.forEach((selector) => {
          const buttons = document.querySelectorAll(selector);
          buttons.forEach((button) => {
            if (disabled) {
              button.setAttribute('disabled', 'disabled');
              if (updateStyles) {
                button.style.pointerEvents = 'none';
                button.style.opacity = '0.6';
              }
            } else {
              button.removeAttribute('disabled');
              if (updateStyles) {
                button.style.pointerEvents = '';
                button.style.opacity = '';
              }
            }
          });
        });
      }

      decoded(text) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        const decoded = tempDiv.textContent;
        return decoded;
      }

      setUnavailable() {
        this.updateButtonsState(true, {
          updateText: true,
          text: FoxTheme.variantStrings.unavailable,
        });
        const price = document.getElementById(`price-${this.dataset.section}`);
        const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
        const sku = document.getElementById(`Sku-${this.dataset.section}`);
        const volumePricing = document.getElementById(`Volume-${this.dataset.section}`);
        const stickyAtcBar = document.getElementById(`shopify-section-sticky-atc-bar`);

        if (price) price.classList.add('hidden');
        if (inventory) inventory.classList.add('hidden');
        if (sku) sku.classList.add('hidden');
        if (volumePricing) volumePricing.classList.add('hidden');
        if (stickyAtcBar) stickyAtcBar.classList.add('hidden');
      }

      initQuantityHandlers() {
        if (!this.quantityInput) return;

        this.setQuantityBoundries();
        if (!this.hasAttribute('data-original-section')) {
          this.cartUpdateUnsubscriber = FoxTheme.pubsub.subscribe(
            FoxTheme.pubsub.PUB_SUB_EVENTS.cartUpdate,
            this.fetchQuantityRules.bind(this)
          );
        }
      }

      setQuantityBoundries() {
        FoxTheme.pubsub.publish(FoxTheme.pubsub.PUB_SUB_EVENTS.quantityBoundries, {
          data: {
            sectionId: this.sectionId,
            productId: this.productId,
          },
        });
      }

      fetchQuantityRules() {
        const currentVariantId = this.productForm?.productIdInput?.value;
        if (!currentVariantId) return;

        this.querySelector('.quantity__rules-cart')?.classList.add('btn--loading');

        fetch(`${this.getAttribute('data-url')}?variant=${currentVariantId}&section_id=${this.sectionId}`)
          .then((response) => response.text())
          .then((responseText) => {
            const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
            this.updateQuantityRules(this.sectionId, this.productId, parsedHTML);
          })
          .catch((error) => {
            console.error(error);
          })
          .finally(() => {
            this.querySelector('.quantity__rules-cart')?.classList.remove('btn--loading');
          });
      }

      updateQuantityRules(sectionId, productId, parsedHTML) {
        if (!this.quantityInput) return;

        FoxTheme.pubsub.publish(FoxTheme.pubsub.PUB_SUB_EVENTS.quantityRules, {
          data: {
            sectionId,
            productId,
            parsedHTML,
          },
        });

        this.setQuantityBoundries();
      }

      getVariantsCache() {
        const script = this.querySelector('variant-selects [data-variants-cache]');
        if (!script) return null;

        // Re-parse when variant-selects has been replaced (combined-listing swap, editor re-render).
        if (this.cachedVariantsSource !== script) {
          try {
            this.cachedVariants = JSON.parse(script.textContent);
          } catch (error) {
            console.error('Failed to parse the variants cache:', error);
            this.cachedVariants = null;
          }
          this.cachedVariantsSource = script;
        }

        return this.cachedVariants;
      }

      // The same nodes variant-selects reads for selectedOptionValues, so the two never disagree.
      //
      // Scoped to the current picker rather than to this element: viewTransition swaps the picker by
      // inserting the new node before the old one and removing the old only 500ms later, so for that
      // window a query from here spans both and returns one selection appended to another — twice as
      // many values as the product has options, or a mix of two selections if the shopper clicks
      // again meanwhile. Every optimistic path then fails its length check and the click falls back
      // to the network, which is what makes the picker feel stuck mid-switch.
      getSelectedOptionValues() {
        const picker = this.variantSelectors;
        if (!picker) return [];

        return Array.from(picker.querySelectorAll('select option[selected], fieldset input:checked')).map(
          (element) => element.value
        );
      }

      matchesOptions(variant, selectedValues) {
        return (
          selectedValues.length > 0 &&
          variant.options.length === selectedValues.length &&
          variant.options.every((option, index) => option === selectedValues[index])
        );
      }

      getVariantFromCache() {
        const variants = this.getVariantsCache();
        if (!variants) return null;

        const selectedValues = this.getSelectedOptionValues();

        return variants.find((variant) => this.matchesOptions(variant, selectedValues)) || null;
      }

      // The cache could not answer, which on a product past 250 variants is every click. Ask the
      // server for that one variant instead of waiting on the section render: still a round trip, but
      // a few hundred bytes rather than the whole section, so price and button land noticeably sooner.
      fetchVariantData(productUrl, optionValues) {
        if (!optionValues.length) return;

        this.variantDataAbortController?.abort();
        this.variantDataAbortController = new AbortController();

        const token = {};
        this.variantDataToken = token;

        fetch(`${productUrl}?section_id=variant-data&option_values=${optionValues.join(',')}`, {
          signal: this.variantDataAbortController.signal,
        })
          .then((response) => (response.ok ? response.text() : Promise.reject(new Error(response.status))))
          .then((responseText) => {
            // A newer click owns the UI by now; this answer describes a variant nobody is looking at.
            if (this.variantDataToken !== token) return;

            const json = new DOMParser().parseFromString(responseText, 'text/html').body.textContent.trim();
            const variant = json ? JSON.parse(json) : null;

            // Shopify resolves option_values server-side, but a set it cannot resolve falls back to
            // the default variant rather than to nothing — a bogus option value id comes back as the
            // current variant, not null. So patch only when the answer describes the combination that
            // was actually asked for; anything else is left to the render and its setUnavailable.
            if (variant && this.matchesOptions(variant, this.getSelectedOptionValues())) {
              this.applyOptimisticUpdate(variant);
            }
          })
          .catch((error) => {
            if (error.name !== 'AbortError') console.error('Variant data fetch failed:', error);
          });
      }

      applyOptimisticUpdate(variant) {
        // Before updateButtonsState: it only re-enables once the form carries a variant id.
        this.updateVariantInputs(variant.id);
        this.updateButtonsState(!variant.available, {
          updateText: true,
          text: variant.available ? null : FoxTheme.variantStrings.soldOut,
        });

        // Quantity price breaks render a price range the variant JSON cannot express. #VolumeNote-
        // exists only in that case, so its presence is the signal to leave the price to the fetch.
        if (!this.querySelector(`#VolumeNote-${this.dataset.section}`)) {
          FoxTheme.updatePriceFromVariant(this.querySelector(`#price-${this.dataset.section}`), variant);
        }

        if (variant.featured_media) this.updateMedia(variant);

        this.updateBadgesOptimistic(variant);
      }

      updateBadgesOptimistic(variant) {
        const badges = this.querySelector(`#Badges-${this.dataset.section}`);
        if (!badges) return;

        const saleBadge = badges.querySelector('.f-badge--sale');
        const soldOutBadge = badges.querySelector('.f-badge--soldout');
        const onSale = variant.compare_at_price && variant.compare_at_price > variant.price;

        // Only badges already in the DOM can be patched: product-badges.liquid renders the in-stock
        // set and the sold-out badge in mutually exclusive branches, so one that has to appear for
        // the first time is left to the section render.
        //
        // visibility, not the .hidden utility: display: none collapses the badge row, which moves
        // every block below it up by the row's height and back again when the render settles — a
        // visible jump for no gain. The section render replaces this markup wholesale, so the
        // inline style never outlives the update.
        if (saleBadge) saleBadge.style.visibility = !variant.in_stock || !onSale ? 'hidden' : '';
        if (soldOutBadge) soldOutBadge.style.visibility = variant.in_stock ? 'hidden' : '';
      }

      disableButtons() {
        this.updateButtonsState(true);
      }

      enableButtons() {
        this.updateButtonsState(false);
      }
    }
  );
}
