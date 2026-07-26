import { useState } from "react";
import type { FormEvent } from "react";
import type { NewPatient, Department } from "../types.ts";

type PatientFormProps = {
  // A function prop. This is "events up": the form can't touch App's patient
  // list, so App hands it a function to call instead. The form's whole job is
  // to collect fields and announce "here's a new one" — what happens next is
  // App's business, not the form's.
  onAdd: (patient: NewPatient) => void;
};

// The empty form, defined once outside the component so it isn't rebuilt on
// every render, and so "reset the form" has something to point at.
const EMPTY: NewPatient = {
  name: "",
  dob: "",
  chiefComplaint: "",
  department: "general",
};

function PatientForm({ onAdd }: PatientFormProps) {
  // One state object for all four fields rather than four useState calls.
  // Fewer setters, and `form` is already exactly the shape onAdd wants.
  const [form, setForm] = useState<NewPatient>(EMPTY);

  function handleSubmit(e: FormEvent) {
    // Without this, the browser does what forms have done since 1995: reload
    // the page and throw away all your state. Every React form needs this line.
    e.preventDefault();

    onAdd(form);
    setForm(EMPTY); // clear the fields for the next patient
  }

  return (
    <form className="patient-form" onSubmit={handleSubmit}>
      {/* These are "controlled inputs": the input's value comes FROM state, and
          typing calls setForm, which re-renders with the new value. React state
          is the source of truth, not the DOM node.

          Set `value` without `onChange` and the field becomes read-only — you
          type and nothing happens, because every render resets it. */}
      <input
        // `required` is the browser's own validation. No library, no code —
        // the form simply won't submit empty. The backend validates too
        // (zod, min(1)); this just catches it before a pointless round trip.
        required
        placeholder="Name"
        value={form.name}
        // Spread the existing fields, override the one that changed. Same
        // immutability rule as the patient list: hand React a NEW object.
        // `setForm(form.name = ...)` would be silently ignored.
        onChange={(e) => setForm({ ...form, name: e.target.value })}
      />

      {/* type="date" gives you a real date picker, keyboard handling, locale
          formatting and validation for free. A date-picker library is one of
          the most commonly installed dependencies nobody needed. */}
      <input
        required
        type="date"
        value={form.dob}
        onChange={(e) => setForm({ ...form, dob: e.target.value })}
      />

      <input
        required
        placeholder="Chief complaint"
        value={form.chiefComplaint}
        onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
      />

      <select
        value={form.department}
        // `e.target.value` is typed `string`, because that's all the DOM knows.
        // We narrow it to Department with a cast — safe here only because the
        // <option> values below are the only things this select can produce.
        // Another spot where we're asserting something TypeScript can't check.
        onChange={(e) =>
          setForm({ ...form, department: e.target.value as Department })
        }
      >
        <option value="general">General</option>
        <option value="ED">ED</option>
      </select>

      <button type="submit">Add patient</button>
    </form>
  );
}

export default PatientForm;
