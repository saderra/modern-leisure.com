if (!customElements.get("footer-details")) {
  class FooterDetails extends AccordionDetails {
    constructor() {
      super();
    }
    
    connectedCallback() {
      this.openDefault = this.dataset.openDefault === 'true';

      if (FoxTheme.config.mqlTablet) {
        if (!this.openDefault) this.toggle(false);
      }

      document.addEventListener('matchTablet', () => {
        this.toggle(this.openDefault);
      });

      document.addEventListener('unmatchTablet', () => {
        this.toggle(true);
      });
    }
  }
  customElements.define('footer-details', FooterDetails, { extends: 'details' });
}