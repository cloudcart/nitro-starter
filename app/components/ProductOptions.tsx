import {useId} from 'react';
import {type MappedProductOptions, useTranslation} from '@cloudcart/nitrogen';
import {useNavigate} from 'react-router';
import {OptionSelect} from '~/components/ui/OptionSelect';
import {OptionValue} from '~/components/ui/OptionValue';
import {productPath} from '~/lib/urls';

type OptionValueChoice = MappedProductOptions['optionValues'][number];

/** The options the buyer chooses from: one with a single value is not a choice. */
export function shownOptions(options: MappedProductOptions[]) {
  return options.filter((option) => option.optionValues.length > 1);
}

/**
 * The product's options as the store presents each (`ProductOption.type`, B-377): a select for a "select" option,
 * else its values as buttons or swatches, each with its name and the value chosen. An option with a single value is
 * not a choice and is left out. Choosing a value of this product changes the URL's options, which pick the variant —
 * with no request when the page has it whole (T-597); a value of another product goes to it.
 */
export function ProductOptions({options}: {options: MappedProductOptions[]}) {
  const navigate = useNavigate();
  // A variant the page has whole (`resolved`) is shown without the loader; another product's, or one the page lacks,
  // comes through it.
  const choose = (value: OptionValueChoice) =>
    void navigate(`${value.isDifferentProduct ? productPath(value.handle) : ''}?${value.variantUriQuery}`, {
      replace: true,
      preventScrollReset: true,
      ...(value.resolved && !value.isDifferentProduct && {defaultShouldRevalidate: false}),
    });

  return shownOptions(options).map((option) => {
    if (option.type === 'select') return <OptionField key={option.name} option={option} onChoose={choose} />;

    const chosen = option.optionValues.find((value) => value.selected)?.name;

    return (
      <fieldset key={option.name} className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">
          {option.name}
          {chosen && <span className="ml-2 font-normal text-muted">{chosen}</span>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {option.optionValues.map((value) => (
            <OptionValue
              key={option.name + value.name}
              name={value.name}
              swatch={value.swatch}
              selected={value.selected}
              available={value.available}
              exists={value.exists}
              to={value.isDifferentProduct ? `${productPath(value.handle)}?${value.variantUriQuery}` : undefined}
              onSelect={() => choose(value)}
            />
          ))}
        </div>
      </fieldset>
    );
  });
}

/**
 * An option the store presents as a select: its name over the tier cards' select (B-379), the chosen value in it. A
 * sold-out value says so; one that no variant has cannot be chosen.
 */
function OptionField({option, onChoose}: {option: MappedProductOptions; onChoose: (value: OptionValueChoice) => void}) {
  const {t} = useTranslation();
  const id = useId();
  const chosen = option.optionValues.find((value) => value.selected);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium">
        {option.name}
      </label>
      <OptionSelect
        id={id}
        value={chosen?.name ?? ''}
        swatch={chosen?.swatch}
        values={option.optionValues.map((value) => ({
          name: value.name,
          label: value.available ? undefined : t('product.valueSoldOut', {value: value.name}),
          disabled: !value.exists,
        }))}
        onChange={(event) => {
          const value = option.optionValues.find((each) => each.name === event.target.value);
          if (value && !value.selected) onChoose(value);
        }}
      />
    </div>
  );
}
