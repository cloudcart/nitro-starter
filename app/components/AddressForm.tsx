import {useState, useEffect} from 'react';
import {Form, useNavigation} from 'react-router';
import type {MailingAddress, MailingAddressInput} from '@cloudcart/nitrogen';
import {PlusIcon, PencilIcon, TrashIcon, XMarkIcon, MapPinIcon, CheckIcon} from '@heroicons/react/24/outline';

export function readAddressFromForm(form: FormData): MailingAddressInput {
  const keys: (keyof MailingAddressInput)[] = [
    'address1', 'address2', 'city', 'country',
    'firstName', 'lastName', 'phone', 'province', 'zip', 'company', 'companyVat',
  ];
  const out: MailingAddressInput = {};
  for (const k of keys) {
    const v = form.get(k);
    if (typeof v === 'string' && v.length) out[k] = v;
  }
  return out;
}

export function AddressListSection({
  title, addresses, defaultAddressId, actionData,
}: {
  title: string;
  addresses: MailingAddress[];
  defaultAddressId: string | undefined | null;
  actionData: {error: string | null; message?: string} | undefined;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (actionData?.message && !actionData?.error) {
      setShowForm(false);
      setEditingId(null);
    }
  }, [actionData]);

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">{title}</h2>
        {!showForm && !editingId && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setEditingId(null); }}
            className="inline-flex items-center gap-1.5 py-2 px-4 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <PlusIcon className="size-4" />
            Add address
          </button>
        )}
      </div>

      {actionData?.error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <XMarkIcon className="size-4 shrink-0" />
          {actionData.error}
        </div>
      )}
      {actionData?.message && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
          <CheckIcon className="size-4 shrink-0" />
          {actionData.message}
        </div>
      )}

      {/* Add form */}
      {showForm && !editingId && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden [&>div:first-child]:rounded-t-[11px]">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white">
            <h3 className="text-sm font-semibold">New address</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="size-5" />
            </button>
          </div>
          <div className="p-5">
            <AddressFormFields method="POST" address={null} isDefault={false} submitLabel="Add address" onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* Edit form */}
      {editingId && (() => {
        const addr = addresses.find(a => a.id === editingId);
        if (!addr) return null;
        return (
          <div className="mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden [&>div:first-child]:rounded-t-[11px]">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-900 text-white">
              <h3 className="text-sm font-semibold">Edit address</h3>
              <button type="button" onClick={() => setEditingId(null)} className="text-gray-400 hover:text-dark transition-colors">
                <XMarkIcon className="size-5" />
              </button>
            </div>
            <div className="p-5">
              <AddressFormFields
                method="PUT"
                address={addr}
                isDefault={defaultAddressId === addr.id}
                submitLabel="Save changes"
                onCancel={() => setEditingId(null)}
              />
            </div>
          </div>
        );
      })()}

      {/* Empty state */}
      {addresses.length === 0 && !showForm ? (
        <div className="py-16 text-center">
          <MapPinIcon className="size-12 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-500 mb-1 font-medium">No addresses yet</p>
          <p className="text-sm text-gray-400 mb-4">Add your first address to speed up checkout.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 text-sm text-brand font-medium hover:underline"
          >
            <PlusIcon className="size-4" />
            Add address
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              isDefault={defaultAddressId === addr.id}
              onEdit={() => { setEditingId(addr.id); setShowForm(false); }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AddressCard({address, isDefault, onEdit}: {address: MailingAddress; isDefault: boolean; onEdit: () => void}) {
  const navigation = useNavigation();
  const isDeleting = navigation.state === 'submitting' && navigation.formData?.get('id') === address.id;
  const fullName = [address.firstName, address.lastName].filter(Boolean).join(' ');

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:shadow-md transition-shadow">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900">
        <div className="flex items-center gap-2">
          <MapPinIcon className="size-3.5 text-gray-400" />
          <span className="text-xs font-medium text-white truncate">{fullName || 'Address'}</span>
        </div>
        {isDefault && (
          <span className="inline-flex items-center gap-1 py-0.5 px-2 bg-emerald-600 text-white text-[0.6rem] font-bold uppercase tracking-wider rounded">
            <CheckIcon className="size-3" />
            Default
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="px-4 py-3 text-sm leading-relaxed text-gray-600 space-y-0.5">
        {address.company && <p className="font-medium text-dark">{address.company}</p>}
        {address.companyVat && <p className="text-xs text-gray-400">VAT: {address.companyVat}</p>}
        {address.address1 && <p>{address.address1}</p>}
        {address.address2 && <p>{address.address2}</p>}
        <p>{[address.city, address.province, address.zip].filter(Boolean).join(', ')}</p>
        {address.country && <p className="font-medium">{address.country}</p>}
        {address.phone && <p className="text-gray-400">{address.phone}</p>}
      </div>

      {/* Card actions */}
      <div className="flex items-center gap-1 px-4 py-2.5 bg-gray-50 border-t border-gray-100">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:text-dark transition-all"
        >
          <PencilIcon className="size-3" />
          Edit
        </button>
        <Form method="DELETE">
          <input type="hidden" name="id" value={address.id} />
          <button
            type="submit"
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 py-1.5 px-3 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-50"
          >
            <TrashIcon className="size-3" />
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </Form>
      </div>
    </div>
  );
}

function AddressFormFields({
  method, address, isDefault, submitLabel, onCancel,
}: {
  method: 'POST' | 'PUT';
  address: MailingAddress | null;
  isDefault: boolean;
  submitLabel: string;
  onCancel?: () => void;
}) {
  const navigation = useNavigation();
  const isBusy = navigation.state === 'submitting';

  return (
    <Form method={method} className="grid grid-cols-2 gap-x-3 gap-y-4">
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      <Field name="firstName" label="First name" autoComplete="given-name" defaultValue={address?.firstName} required />
      <Field name="lastName" label="Last name" autoComplete="family-name" defaultValue={address?.lastName} required />
      <Field name="company" label="Company" autoComplete="organization" defaultValue={address?.company} full />
      <Field name="companyVat" label="VAT number" defaultValue={address?.companyVat} full />
      <Field name="address1" label="Address" autoComplete="address-line1" defaultValue={address?.address1} required full />
      <Field name="address2" label="Apt, suite, etc." autoComplete="address-line2" defaultValue={address?.address2} full />
      <Field name="city" label="City" autoComplete="address-level2" defaultValue={address?.city} required />
      <Field name="province" label="State / Province" autoComplete="address-level1" defaultValue={address?.province} />
      <Field name="zip" label="ZIP / Postal code" autoComplete="postal-code" defaultValue={address?.zip} required />
      <Field name="country" label="Country" autoComplete="country-name" defaultValue={address?.country} required />
      <Field name="phone" label="Phone" autoComplete="tel" defaultValue={address?.phone} full />

      <label className="col-span-2 flex items-center gap-2 text-sm text-gray-500 select-none cursor-pointer">
        <input type="checkbox" name="defaultAddress" defaultChecked={isDefault} className="rounded border-gray-300 text-brand focus:ring-brand/20" />
        Set as default
      </label>

      <div className="col-span-2 flex gap-2 pt-2">
        <button type="submit" disabled={isBusy} className="py-2.5 px-5 bg-brand text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity">
          {isBusy ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="py-2.5 px-5 text-sm text-gray-500 hover:text-dark transition-colors">
            Cancel
          </button>
        )}
      </div>
    </Form>
  );
}

function Field({
  name, label, autoComplete, defaultValue, required, full,
}: {
  name: string;
  label: string;
  autoComplete?: string;
  defaultValue?: string | null;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? 'col-span-2' : ''}`}>
      <span className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}{required ? <span className="text-red-400 ml-0.5">*</span> : ''}
      </span>
      <input
        type="text"
        name={name}
        autoComplete={autoComplete}
        defaultValue={defaultValue ?? ''}
        required={required}
        className="form-input w-full py-2.5 px-3 text-sm border border-gray-200 rounded-lg bg-white placeholder:text-gray-300 focus:border-brand focus:ring-2 focus:ring-brand/10 transition-colors"
      />
    </label>
  );
}
