if (!customElements.get('product-list-with-details')) {
  customElements.define(
    'product-list-with-details',
    class ProductListWithDetails extends HTMLElement {
      constructor() {
        super();

        this.selectors = {
          productCards: '.col-product-card',
          colProductDetails: '.col-details__inner',
        };
      }

      connectedCallback() {
        if (this.dataset.hoverable !== 'true') {
          return;
        }

        if (FoxTheme.config.mqlMobile) {
          return;
        }

        this.productCards = this.querySelectorAll(this.selectors.productCards);
        this.colProductDetails = this.querySelector(this.selectors.colProductDetails);
        this.selectedIndex = 0;
        this.hoverTracker = null;

        // On touch there is no hover, so a tap must reveal the details that a desktop
        // hover does. A second tap on the already-active card then follows its product
        // link. (The sidebar hover-cancel only matters when an actual pointer can move
        // between card and sidebar, so it is desktop-only.)
        if (FoxTheme.config.isTouch) {
          this.productCards.forEach((pcard) => {
            pcard.addEventListener('click', (e) => this.onTouchSelect(e));
          });
        } else {
          this.productCards.forEach((pcard) => {
            pcard.addEventListener('mouseenter', (e) => this.onMouseOver(e));
          });

          this.colProductDetails.addEventListener('mouseenter', (e) => this.handleSidebarHovered(e));
        }
      }

      handleSidebarHovered() {
        clearTimeout(this.hoverTracker);
      }

      onMouseOver(evt) {
        const product = evt.currentTarget;
        const index = product.dataset.index;

        clearTimeout(this.hoverTracker);
        this.hoverTracker = setTimeout(() => {
          if (this.selectedIndex != index) {
            this.selectedIndex = index;
            this.showDetails(index);
          }
        }, 250);
      }

      onTouchSelect(evt) {
        const index = evt.currentTarget.dataset.index;

        // Already showing this product's details: let the tap follow its product link.
        if (this.selectedIndex == index) return;

        // Otherwise treat the tap like a hover and reveal the details (no navigation yet).
        evt.preventDefault();
        clearTimeout(this.hoverTracker);
        this.selectedIndex = index;
        this.showDetails(index);
      }

      showDetails(index) {
        const allProducts = this.colProductDetails.querySelectorAll('.plwd-product');
        allProducts.forEach((product) => {
          product.classList.remove('active');
        });

        let productToShow = this.colProductDetails.querySelector(`.plwd-product[data-index="${index}"]`);
        if (!productToShow) {
          const template = this.colProductDetails.querySelector(`template[data-index="${index}"]`);
          const templateContent = template.content.cloneNode(true);
          productToShow = templateContent.querySelector('.plwd-product');
          this.colProductDetails.appendChild(productToShow);
        }

        productToShow.classList.add('active');
      }
    }
  );
}
