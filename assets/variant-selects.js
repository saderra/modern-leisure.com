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
          this.resolveImpossibleSelection(target);
          FoxTheme.pubsub.publish(FoxTheme.pubsub.PUB_SUB_EVENTS.optionValueSelectionChange, {
            data: {
              event,
              target,
              selectedOptionValues: this.selectedOptionValues,
            },
          });
        });
      }

      getVariantsCache() {
        const script = this.querySelector('[data-variants-cache]');
        if (!script) return null;

        try {
          return JSON.parse(script.textContent);
        } catch (error) {
          return null;
        }
      }

      /**
       * A click can land on a combination no variant has (Green while 1-Pack is selected, when only
       * Green / 2-Pack exists). Left alone, the product shows "Unavailable" and keeps the old photo,
       * so move the other options to the closest variant that has the clicked value instead: one in
       * stock if there is one, then the one that changes the fewest other options.
       * @param {HTMLElement} target the input or option that was chosen
       */
      resolveImpossibleSelection(target) {
        const variants = this.getVariantsCache();
        if (!variants?.length) return;

        const groups = Array.from(this.querySelectorAll('.product-form__input'));
        const selected = groups.map(
          (group) => group.querySelector('select option[selected], input:checked')?.value
        );
        const matches = (variant) => variant.options.every((option, index) => option === selected[index]);
        if (variants.some(matches)) return;

        const changedIndex = groups.findIndex((group) => group.contains(target));
        const candidates = variants.filter((variant) => variant.options[changedIndex] === selected[changedIndex]);
        if (!candidates.length) return;

        const score = (variant) =>
          (variant.available ? 100 : 0) + variant.options.filter((option, index) => option === selected[index]).length;
        const closest = candidates.reduce((best, variant) => (score(variant) > score(best) ? variant : best));

        groups.forEach((group, index) => {
          const value = closest.options[index];
          if (index === changedIndex || value === selected[index]) return;

          const select = group.querySelector('select');
          if (select) {
            if (!Array.from(select.options).some((option) => option.value === value)) return;
            select.value = value;
            this.updateSelectedSwatchValue({ target: select });
            return;
          }

          const input = Array.from(group.querySelectorAll('input[type="radio"]')).find((radio) => radio.value === value);
          if (!input) return;
          input.checked = true;
          this.updateSelectedSwatchValue({ target: input });
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
