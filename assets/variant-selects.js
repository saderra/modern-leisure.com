if (!customElements.get('variant-selects')) {
  customElements.define(
    'variant-selects',
    class VariantSelects extends HTMLElement {
      constructor() {
        super();
      }

      get selectedOptionValues() {
        return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
          ({ dataset }) => dataset.optionValueId
        );
      }

      getInputForEventTarget(target) {
        return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
      }

      connectedCallback() {
        this.addEventListener('change', (event) => {
          const target = this.getInputForEventTarget(event.target);
          this.updateSelectedSwatchValue(event);
          FoxTheme.pubsub.publish(FoxTheme.pubsub.PUB_SUB_EVENTS.optionValueSelectionChange, {
            data: {
              event,
              target,
              selectedOptionValues: this.selectedOptionValues,
            },
          });
        });
      }

      /**
       * The value shown beside the option name ("Material: oak"). Every picker type renders it as
       * [data-selected-swatch-value], so update that: the previous code looked for
       * [data-selected-value], which exists only inside the swatch_dropdown branch, so querySelector
       * returned null and the label silently kept the server's value until the section render
       * replaced the whole picker.
       * @param {HTMLElement} target the input or select that changed
       * @param {string} value the newly selected option value
       */
      updateSelectedLabel(target, value) {
        const label = target.closest('.product-form__input')?.querySelector('[data-selected-swatch-value]');
        if (label) label.textContent = value;
      }

      updateSelectedSwatchValue({ target }) {
        const { value, tagName } = target;

        if (tagName === 'SELECT' && target.selectedOptions.length) {
          // Optional call: a picker re-rendered without a selected attribute would otherwise throw
          // here, and everything below — including the label — would never run.
          Array.from(target.options)
            .find((option) => option.getAttribute('selected'))
            ?.removeAttribute('selected');
          target.selectedOptions[0].setAttribute('selected', 'selected');

          this.updateSelectedLabel(target, target.selectedOptions[0].value);

          const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
          const selectedDropdownSwatchValue = target
            .closest('.product-form__input')
            .querySelector('[data-selected-value] > .swatch');
          if (!selectedDropdownSwatchValue) return;
          if (swatchValue) {
            selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
            selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
          } else {
            selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
            selectedDropdownSwatchValue.classList.add('swatch--unavailable');
          }

          selectedDropdownSwatchValue.style.setProperty(
            '--swatch-focal-point',
            target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
          );
        } else if (tagName === 'INPUT' && target.type === 'radio') {
          this.updateSelectedLabel(target, value);
        }
      }
    }
  );
}
