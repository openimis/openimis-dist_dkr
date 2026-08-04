import { useMemo, useState } from "react";
import PropTypes from "prop-types";

const EMPTY_ITEM = { service_code: "", description: "", quantity: 1, unit_price: 0 };

function emptyForm() {
  return {
    patient_name: "",
    patient_id: "",
    dob: "",
    gender: "F",
    facility_name: "",
    facility_code: "",
    visit_date: new Date().toISOString().slice(0, 10),
    diagnosis_code: "",
    diagnosis_description: "",
    coverage_start_date: "",
    coverage_end_date: "",
    scheme_code: "SHA-2025",
    items: [{ ...EMPTY_ITEM }],
  };
}

/**
 * Modal form for adding a new claim to the queue. Deliberately mirrors the
 * exact fields the 7 validation rules check, so an officer filling this in
 * already understands what "complete" looks like before they even hit
 * Validate — the form itself teaches the rules.
 */
export default function AddClaimModal({ onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [amountOverride, setAmountOverride] = useState("");

  const itemsTotal = useMemo(
    () =>
      form.items.reduce(
        (sum, item) => sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0),
        0
      ),
    [form.items]
  );

  const claimedAmount = amountOverride !== "" ? Number(amountOverride) : itemsTotal;

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateItem(index, field, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }

  function addItemRow() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  }

  function removeItemRow(index) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        items: form.items.filter((item) => item.service_code || item.description),
        claimed_amount: claimedAmount,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-claim-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-full overflow-y-auto shadow-xl animate-fade-in">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 id="add-claim-title" className="text-lg font-semibold text-slate-900">
            Add a new claim
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Patient */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Patient
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Patient name" required>
                <input
                  required
                  value={form.patient_name}
                  onChange={(e) => updateField("patient_name", e.target.value)}
                  className="input"
                  placeholder="Grace Wanjiru Njoroge"
                />
              </Field>
              <Field label="Insuree / Patient ID" required>
                <input
                  required
                  value={form.patient_id}
                  onChange={(e) => updateField("patient_id", e.target.value)}
                  className="input"
                  placeholder="INS-KE-44218"
                />
              </Field>
              <Field label="Date of birth">
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => updateField("dob", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Gender">
                <select
                  value={form.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                  className="input"
                >
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </Field>
            </div>
          </fieldset>

          {/* Visit */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Visit
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Facility name" required>
                <input
                  required
                  value={form.facility_name}
                  onChange={(e) => updateField("facility_name", e.target.value)}
                  className="input"
                  placeholder="Kenyatta National Hospital"
                />
              </Field>
              <Field label="Facility code" required>
                <input
                  required
                  value={form.facility_code}
                  onChange={(e) => updateField("facility_code", e.target.value)}
                  className="input"
                  placeholder="KNH-001"
                />
              </Field>
              <Field label="Visit date" required>
                <input
                  required
                  type="date"
                  value={form.visit_date}
                  onChange={(e) => updateField("visit_date", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Diagnosis (ICD-10)" required>
                <input
                  required
                  value={form.diagnosis_code}
                  onChange={(e) => updateField("diagnosis_code", e.target.value.toUpperCase())}
                  className="input font-mono"
                  placeholder="J18.9"
                />
              </Field>
              <Field label="Diagnosis description" className="col-span-2">
                <input
                  value={form.diagnosis_description}
                  onChange={(e) => updateField("diagnosis_description", e.target.value)}
                  className="input"
                  placeholder="Pneumonia, unspecified organism"
                />
              </Field>
            </div>
          </fieldset>

          {/* Coverage */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
              Coverage
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Coverage start">
                <input
                  type="date"
                  value={form.coverage_start_date}
                  onChange={(e) => updateField("coverage_start_date", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Coverage end">
                <input
                  type="date"
                  value={form.coverage_end_date}
                  onChange={(e) => updateField("coverage_end_date", e.target.value)}
                  className="input"
                />
              </Field>
              <Field label="Scheme code" className="col-span-2">
                <input
                  value={form.scheme_code}
                  onChange={(e) => updateField("scheme_code", e.target.value)}
                  className="input"
                />
              </Field>
            </div>
          </fieldset>

          {/* Items */}
          <fieldset className="space-y-3">
            <div className="flex items-center justify-between">
              <legend className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Service items
              </legend>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs text-teal-600 hover:text-teal-800 font-medium"
              >
                + Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, index) => (
                // eslint-disable-next-line react/no-array-index-key -- rows have no stable id until saved
                <div key={index} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={item.service_code}
                    onChange={(e) => updateItem(index, "service_code", e.target.value)}
                    placeholder="SHA-CONS-001"
                    className="input col-span-3 font-mono text-xs"
                  />
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    placeholder="Description"
                    className="input col-span-4"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, "quantity", e.target.value)}
                    className="input col-span-2"
                    aria-label="Quantity"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                    className="input col-span-2"
                    aria-label="Unit price (KES)"
                  />
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    aria-label="Remove item"
                    className="col-span-1 text-slate-400 hover:text-red-500 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </fieldset>

          {/* Claimed amount */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
            <div>
              <p className="text-xs text-slate-500">Items total</p>
              <p className="text-sm font-semibold text-slate-800">
                KES {itemsTotal.toLocaleString()}
              </p>
            </div>
            <Field label="Claimed amount (KES)" className="w-40">
              <input
                type="number"
                min="0"
                value={amountOverride}
                onChange={(e) => setAmountOverride(e.target.value)}
                placeholder={String(itemsTotal)}
                className="input"
              />
            </Field>
          </div>

          <div className="flex gap-3 pt-2 pb-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-60 active:scale-95 transition-all"
            >
              {submitting ? "Adding…" : "Add claim to queue"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-slate-500 mb-1">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  required: PropTypes.bool,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

AddClaimModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
};
