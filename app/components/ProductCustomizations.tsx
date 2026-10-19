import {type ReactNode, useEffect, useId, useRef, useState} from 'react';
import {uploadCartCustomizationFile, useTranslation} from '@cloudcart/nitrogen';
import {Image} from '@cloudcart/nitrogen-react';
import type {CartLineCustomizationInput} from '@cloudcart/nitrogen/storefront-api-types';
import type {ProductFragment} from 'storefrontapi.generated';
import {Checkbox, Input, Radio, RequiredMark, Select, Textarea} from '~/components/ui/Field';
import {Charge, chargeText} from '~/components/Charge';
import {CloseIcon} from '~/components/ui/icons';
import {formatBytes} from '~/lib/format';

type Customization = ProductFragment['customizations'][number];
export type CustomizationAnswers = Record<string, CartLineCustomizationInput>;

/** Whether an answer says something: a value that is not blank, or a list without a blank one. */
export function isAnswered(answer?: CartLineCustomizationInput) {
  return Boolean(
    answer &&
    ((answer.value && answer.value.trim() !== '') ||
      (answer.values && answer.values.length > 0 && answer.values.every((value) => value.trim() !== ''))),
  );
}

/** The required customizations not answered yet, in the merchant's order. */
export function missingCustomizations(customizations: Customization[], answers: CustomizationAnswers) {
  return sortCustomizations(customizations).filter(
    (customization) => customization.required && !isAnswered(answers[customization.id]),
  );
}

function sortCustomizations(customizations: Customization[]) {
  return [...customizations].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * The merchant's customizations of the product, each asked the way its type is answered: a choice (a list, radio
 * buttons, checkboxes or pictures), text, a measure, an area, or a file the buyer uploads. What each adds to the
 * price is shown beside it.
 */
export function ProductCustomizations({
  customizations,
  answers,
  onChange,
}: {
  customizations: Customization[];
  answers: CustomizationAnswers;
  onChange: (answer: CartLineCustomizationInput) => void;
}) {
  if (!customizations.length) return null;

  return (
    <div className="flex flex-col gap-5">
      {sortCustomizations(customizations).map((customization) => (
        <CustomizationInput
          key={customization.id}
          customization={customization}
          answer={answers[customization.id]}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function CustomizationInput({
  customization,
  answer,
  onChange,
}: {
  customization: Customization;
  answer?: CartLineCustomizationInput;
  onChange: (answer: CartLineCustomizationInput) => void;
}) {
  const {t, language} = useTranslation();
  const {id, type, required, multiple, values, valueSymbol} = customization;
  const set = (patch: Partial<CartLineCustomizationInput>) => onChange({customizationId: id, ...patch});
  const heading = <Heading customization={customization} />;

  switch (type) {
    case 'select':
    case 'radio':
    case 'checkbox':
    case 'image': {
      if (multiple || type === 'checkbox') {
        const chosen = answer?.values ?? (answer?.value ? [answer.value] : []);
        return (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2">{heading}</legend>
            {values.map((value) => (
              <label key={value.id} className="flex min-h-9 items-center gap-3 text-body">
                <Checkbox
                  checked={chosen.includes(value.id)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...chosen, value.id]
                      : chosen.filter((item) => item !== value.id);
                    set(multiple ? {values: next} : {value: next[next.length - 1] ?? ''});
                  }}
                />
                {value.label}
                <Charge charge={value} />
              </label>
            ))}
          </fieldset>
        );
      }
      if (type === 'image') {
        return (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2">{heading}</legend>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => (
                <label
                  key={value.id}
                  className="flex w-24 cursor-pointer flex-col items-center gap-1 rounded-card border-2 border-border p-1 text-center text-small has-checked:border-accent has-focus-visible:ring-2 has-focus-visible:ring-accent"
                >
                  <input
                    type="radio"
                    name={id}
                    className="sr-only"
                    required={required}
                    checked={answer?.value === value.id}
                    onChange={() => set({value: value.id})}
                  />
                  {value.image ? (
                    <Image src={value.image} alt="" width={84} aspectRatio="1/1" className="w-full object-cover" />
                  ) : (
                    <span className="aspect-square w-full bg-surface" />
                  )}
                  {value.label}
                  <Charge charge={value} />
                </label>
              ))}
            </div>
          </fieldset>
        );
      }
      if (type === 'radio') {
        return (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2">{heading}</legend>
            {values.map((value) => (
              <label key={value.id} className="flex min-h-9 items-center gap-3 text-body">
                <Radio name={id} checked={answer?.value === value.id} onChange={() => set({value: value.id})} />
                {value.label}
                <Charge charge={value} />
              </label>
            ))}
          </fieldset>
        );
      }
      return (
        <Labelled heading={heading}>
          {(controlId) => (
            <Select id={controlId} value={answer?.value ?? ''} onChange={(event) => set({value: event.target.value})}>
              <option value="">{t('product.choose')}</option>
              {values.map((value) => (
                <option key={value.id} value={value.id}>
                  {value.label}
                  {chargeText(value, language) && ` (${chargeText(value, language)})`}
                </option>
              ))}
            </Select>
          )}
        </Labelled>
      );
    }
    case 'text':
      return (
        <Labelled heading={heading}>
          {(controlId) => (
            <Input id={controlId} value={answer?.value ?? ''} onChange={(event) => set({value: event.target.value})} />
          )}
        </Labelled>
      );
    case 'textarea':
      return (
        <Labelled heading={heading}>
          {(controlId) => (
            <Textarea
              id={controlId}
              rows={3}
              value={answer?.value ?? ''}
              onChange={(event) => set({value: event.target.value})}
            />
          )}
        </Labelled>
      );
    case 'weight':
    case 'length':
      return (
        <Labelled heading={heading}>
          {(controlId) => (
            <span className="flex items-center gap-2">
              <Input
                id={controlId}
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                className="w-32"
                value={answer?.value ?? ''}
                onChange={(event) => set({value: event.target.value})}
              />
              {valueSymbol && <span className="text-small text-muted">{valueSymbol}</span>}
            </span>
          )}
        </Labelled>
      );
    case 'square': {
      const [length = '', width = ''] = answer?.values ?? [];
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2">{heading}</legend>
          <span className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              aria-label={t('product.length')}
              placeholder={t('product.length')}
              className="w-28"
              value={length}
              onChange={(event) => set({values: [event.target.value, width]})}
            />
            <span aria-hidden="true">×</span>
            <Input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              aria-label={t('product.width')}
              placeholder={t('product.width')}
              className="w-28"
              value={width}
              onChange={(event) => set({values: [length, event.target.value]})}
            />
            {valueSymbol && <span className="text-small text-muted">{valueSymbol}</span>}
          </span>
          {customization.minSquare && (
            <span className="text-small text-muted">{t('product.atLeast', {value: customization.minSquare})}</span>
          )}
        </fieldset>
      );
    }
    case 'file':
      return <FileCustomization customization={customization} heading={heading} onChange={onChange} />;
    default:
      return null;
  }
}

/** The customization's name, whether it is required, and what it adds to the price. */
function Heading({customization}: {customization: Customization}) {
  return (
    <span className="font-medium">
      {customization.label}
      {customization.required && <RequiredMark announce />}
      <Charge charge={customization} />
    </span>
  );
}

/** A heading that labels one control. */
function Labelled({heading, children}: {heading: ReactNode; children: (controlId: string) => ReactNode}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id}>{heading}</label>
      {children(id)}
    </div>
  );
}

type Upload =
  | {status: 'idle'}
  | {status: 'uploading'; name: string}
  | {status: 'attached'; name: string}
  | {status: 'refused'; message: string};

/**
 * A file the buyer uploads (`uploadCartCustomizationFile`): checked here against the store's limits first, then
 * stored by the store, whose handle is the answer sent with the line. The store checks the file itself again.
 */
function FileCustomization({
  customization,
  heading,
  onChange,
}: {
  customization: Customization;
  heading: ReactNode;
  onChange: (answer: CartLineCustomizationInput) => void;
}) {
  const {t, language} = useTranslation();
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [upload, setUpload] = useState<Upload>({status: 'idle'});
  const limits = customization.fileUpload;
  const extensions = limits?.allowedExtensions ?? [];
  const maxSize = limits?.maxFileSize ?? 0;
  const accept = [...extensions.map((extension) => `.${extension}`), ...(limits?.allowedMimeTypes ?? [])].join(',');
  const answer = (value: string) => onChange({customizationId: customization.id, value});

  useEffect(() => () => abortRef.current?.abort(), []);

  async function choose(file: File | undefined) {
    abortRef.current?.abort();
    answer('');
    if (!file) return setUpload({status: 'idle'});

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (maxSize > 0 && file.size > maxSize) {
      return setUpload({
        status: 'refused',
        message: t('product.file.tooLarge', {size: formatBytes(maxSize, language)}),
      });
    }
    if (extensions.length > 0 && !extensions.includes(extension)) {
      return setUpload({status: 'refused', message: t('product.file.wrongType')});
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setUpload({status: 'uploading', name: file.name});
    try {
      const result = await uploadCartCustomizationFile({
        customizationId: customization.id,
        file,
        signal: controller.signal,
      });
      if (result.file) {
        answer(result.file.handle);
        setUpload({status: 'attached', name: file.name});
      } else {
        setUpload({status: 'refused', message: result.userErrors[0]?.message ?? t('product.file.failed')});
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error(error);
      setUpload({status: 'refused', message: t('product.file.failed')});
    }
  }

  function remove() {
    abortRef.current?.abort();
    answer('');
    setUpload({status: 'idle'});
    if (inputRef.current) inputRef.current.value = '';
  }

  const hints = [
    extensions.length > 0 &&
      t('product.file.types', {types: extensions.map((extension) => extension.toUpperCase()).join(t('format.list'))}),
    maxSize > 0 && t('product.file.maxSize', {size: formatBytes(maxSize, language)}),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId}>{heading}</label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept || undefined}
        aria-describedby={statusId}
        onChange={(event) => void choose(event.target.files?.[0])}
        className="text-small file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-button file:border file:border-foreground file:bg-transparent file:px-4 file:text-small file:font-medium"
      />
      <div id={statusId} aria-live="polite" className="flex flex-col gap-1 text-small">
        {hints.length > 0 && <span className="text-muted">{hints.join(t('format.separator'))}</span>}
        {upload.status === 'uploading' && (
          <span className="text-muted">{t('product.file.uploading', {name: upload.name})}</span>
        )}
        {upload.status === 'attached' && (
          <span className="flex items-center gap-2 text-success">
            {t('product.file.attached', {name: upload.name})}
            <button
              type="button"
              onClick={remove}
              aria-label={t('product.file.remove')}
              className="grid size-8 place-items-center rounded-full text-muted hover:text-foreground"
            >
              <CloseIcon className="size-4" />
            </button>
          </span>
        )}
        {upload.status === 'refused' && (
          <span role="alert" className="text-error">
            {upload.message}
          </span>
        )}
      </div>
    </div>
  );
}
