if (!customElements.get('sticky-atc-bar')) {
  customElements.define(
    'sticky-atc-bar',
    class StickyAtcBar extends HTMLElement {
      constructor() {
        super();
        document.body.classList.add('sticky-atc-bar-enabled');

        this.selectors = {
          variantIdSelect: '[name="id"]',
        };
      }

      get quantityInput() {
        return this.querySelector('quantity-input input');
      }
      get quantity() {
        return this.querySelector('quantity-input');
      }
      get sectionId() {
        return this.dataset.originalSection || this.dataset.section;
      }
      get productId() {
        return this.getAttribute('data-product-id');
      }
      get select() {
        return this.querySelector('select');
      }
      get productForm() {
        return this.querySelector('form[is="product-form"]');
      }

      connectedCallback() {
        this.productFormActions = document.querySelector(`.main-product-form[data-product-id="${this.productId}"]`);
        this.mainProductInfo = document.querySelector(`product-info[data-product-id="${this.productId}"]`);
        this.container = this.closest('.sticky-atc-bar');
        this.submitButton = this.querySelector('[type="submit"]');
        this.selectedVariantId = this.querySelector(this.selectors.variantIdSelect).value;
        const img = this.querySelector('.sticky-atc-bar__product-image img');
        this.mainImageSrc = img ? img.src : null;
        this.mainImageAlt = img ? img.alt : '';

        this.variantData = this.getVariantData();

        this.init();
        this.select.addEventListener('change', (e) => {
          if (this.isUpdating) return;
          this.isUpdating = true;

          this.updateQuantityInput();

          this.mainVariantSelects = this.mainProductInfo && this.mainProductInfo.querySelector('variant-selects');
          const selectedVariantId = this.querySelector(this.selectors.variantIdSelect).value;
          this.currentVariant = this.variantData.find((variant) => variant.id === Number(selectedVariantId));

          if (this.mainVariantSelects) {
            Array.from(this.mainVariantSelects.querySelectorAll('select, fieldset'), (element, index) => {
              const variantOptionVal = this.currentVariant.options[index];
              switch (element.tagName) {
                case 'SELECT':
                  element.value = variantOptionVal;
                  const options = element.querySelectorAll('option');
                  options.forEach((option) => option.removeAttribute('selected'));

                  element.value = variantOptionVal;
                  const selectedOption = element.querySelector(`option[value="${variantOptionVal}"]`);
                  if (selectedOption) {
                    selectedOption.setAttribute('selected', 'selected');
                  }
                  break;
                case 'FIELDSET':
                  Array.from(element.querySelectorAll('input')).forEach((radio) => {
                    if (radio.value === variantOptionVal) {
                      radio.checked = true;
                    }
                  });
                  break;
              }
            });
            setTimeout(() => {
              this.mainVariantSelects.dispatchEvent(new Event('change', { detail: { formStickty: true } }));
              this.isUpdating = false;
            }, 0);
          } else {
            this.isUpdating = false;
          }

          this.updatePrice();
          this.updateImage();
          this.updateButton(true, '', false);
          if (!this.currentVariant) {
            this.updateButton(true, '', true);
          } else {
            this.updateButton(!this.currentVariant.available, FoxTheme.variantStrings.soldOut);
          }
        });

        const hasRequiredFields = this.validateMainProductRequiredFields();
        if (hasRequiredFields) {
          this.submitButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.productFormActions.scrollIntoView({ behavior: FoxTheme.config.disableAnimations ? 'auto' : 'smooth', block: 'center' });
            setTimeout(() => {
              this.productFormActions.requestSubmit();
            }, 300);
          });
        }
      }

      validateMainProductRequiredFields() {
        const mainForm = this.mainProductInfo;
        if (!mainForm) return true;
        const requiredFields = mainForm.querySelectorAll('[data-custom-property]');
        return requiredFields.length > 0;
      }

      updateQuantityInput() {
        this.currentVariant = this.variantData.find((variant) => variant.id === Number(this.selectedVariantId));
        fetch(`${this.getAttribute('data-url')}?variant=${this.currentVariant.id}&section_id=${this.sectionId}`)
          .then((response) => response.text())
          .then((responseText) => {
            const parsedHTML = new DOMParser().parseFromString(responseText, 'text/html');
            const quantity = document.querySelector(`#QuantitySticky-${this.sectionId}`);
            const newQuantity = parsedHTML.querySelector(`#QuantitySticky-${this.sectionId}`);
            if (newQuantity) {
              quantity.innerHTML = newQuantity.innerHTML;
            }
          })
          .catch((error) => {
            console.error(error);
          })
          .finally(() => {});
      }

      getVariantData() {
        this.variantData =
          this.variantData || JSON.parse(this.container.querySelector('[type="application/json"]').textContent);
        return this.variantData;
      }

      init() {
        if (!this.productFormActions) {
          this.container.classList.add('sticky-atc-bar--show');
          return;
        }

        const mql = window.matchMedia(FoxTheme.config.mediaQueryMobile);
        mql.onchange = this.checkDevice.bind(this);
        this.checkDevice();

        const rootMargin = `-80px 0px 0px 0px`;
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              const method = entry.intersectionRatio !== 1 ? 'add' : 'remove';
              this.container.classList[method]('sticky-atc-bar--show');
            });
          },
          { threshold: 1, rootMargin }
        );
        this.setObserveTarget();
        this.syncWithMainProductForm();
      }

      setObserveTarget() {
        this.observer.observe(this.productFormActions);
        this.observeTarget = this.productFormActions;
      }

      checkDevice(e) {
        document.documentElement.style.setProperty('--sticky-atc-bar-height', this.clientHeight + 'px');
      }

      updateButton(disable = true, text, modifyClass = true) {
        const productForm = this.querySelector('#product-form-sticky-atc-bar');
        if (!productForm) return;

        const addButton = productForm.querySelector('[name="add"]');
        if (!addButton) return;

        const addButtonText = addButton.querySelector('span');
        if (disable) {
          addButton.setAttribute('disabled', 'disabled');
          if (text) addButtonText.textContent = text;
        } else {
          addButton.removeAttribute('disabled');
          addButtonText.textContent = FoxTheme.variantStrings.addToCart;
        }
      }

      updateImage() {
        const imageWrapper = this.querySelector('[data-variant-image]');
        if (!imageWrapper) return;
        const selected = this.querySelector('[name="id"] option:checked');
        const src = selected ? selected.getAttribute('data-variant-image') : null;
        let img = imageWrapper.querySelector('img');
        if (src) {
          if (img) {
            img.src = src;
            img.removeAttribute('srcset');
          } else {
            imageWrapper.innerHTML = `<img src="${src}" class="motion-reduce" loading="lazy" fetchpriority="low" is="image-lazy" widths="90, 180" sizes="90px">`;
          }
        } else if (this.mainImageSrc) {
          if (img) {
            img.src = this.mainImageSrc;
            img.removeAttribute('srcset');
          } else {
            imageWrapper.innerHTML = `<img src="${this.mainImageSrc}" class="motion-reduce" loading="lazy" fetchpriority="low" is="image-lazy" widths="90, 180" sizes="90px">`;
          }
        }
      }

      updatePrice() {
        FoxTheme.updatePriceFromVariant(this, this.currentVariant);
      }

      syncWithMainProductForm() {
        FoxTheme.pubsub.subscribe(FoxTheme.pubsub.PUB_SUB_EVENTS.variantChange, (event) => {
          const isMainProduct = event.data.sectionId === this.mainProductInfo.dataset.section;
          if (!isMainProduct) return;
          const variant = event.data.variant;
          const variantInput = this.querySelector('[name="id"]');

          this.currentVariant = variant;
          variantInput.value = variant.id;
          this.updateImage();
          this.updatePrice();
          this.updateButton(true, '', false);
          if (!variant) {
            this.updateButton(true, '', true);
          } else {
            this.updateButton(!variant.available, FoxTheme.variantStrings.soldOut);
          }

          this.updateQuantityInput();
        });
      }
    }
  );
}
