import type { Patient, NewPatient } from "../types.ts";
import PatientForm from "./PatientForm.tsx";
import PatientStats from "./PatientStats.tsx";

// Props are just the arguments a component takes. This type describes them.
// Naming it `<Component>Props` is convention, not a rule — but everyone does it,
// so do it too.
//
// The component will take an array of patient objects
type BodyProps = {
  patients: Patient[];
  // `string | null` — either a message to show, or nothing went wrong.
  // Not optional (`error?`) on purpose: making it required means App can't
  // forget to pass it, and the compiler enforces that.
  error: string | null;
  // Body never calls this itself — it just hands it to PatientForm. That's
  // prop drilling, and one level of it is completely normal. It only becomes
  // a problem when you're threading a prop through four components that
  // don't care about it.
  onAdd: (patient: NewPatient) => void;
  onRemove: (id: number) => void;
};

// `{ patients }: BodyProps` is two things at once:
//   - `: BodyProps` types the single argument React passes in
//   - `{ patients }` destructures that object, pulling out the one field we want
//
// The unabbreviated version is `function Body(props: BodyProps)` and then
// `props.patients` everywhere. Destructuring in the signature is just shorter.
//
// The payoff: <Body /> with no patients is now a compile error, and so is
// <Body patients={5} />. The contract between App and Body is checked.
function Body({ patients, error, onAdd, onRemove }: BodyProps) {
  // SA-09
  // Show the board alphabetically rather than in arrival order.
  patients.sort((a, b) => a.name.localeCompare(b.name)); // this is modifying a prop passed through (bad conventions, props should be read only)

  // An early return — a plain `if`, above the JSX, where statements are legal.
  // Used here rather than another ternary because the two branches share almost
  // nothing. Without this, a backend that's down would render "No patients yet."
  // and quietly look like an empty hospital.
  if (error) {
    return (
      <main className="body">
        <p className="error">Couldn't load patients — {error}</p>
      </main>
    );
  }

  return (
    <main className="body">
      <PatientForm onAdd={onAdd} />

      <PatientStats
        patients={patients}
        title={`${patients.length} on the board`}
      />

      {/* JSX has no `if`. Anything inside {} is a plain JavaScript expression,
          and `if` is a statement, not an expression. So conditionals use the
          ternary `cond ? a : b`, which IS an expression. */}

      {/* if patients have nothing, we only render the first html block, otherwise we do the other, larger one*/}
      {patients.length === 0 ? (
        <p className="empty">No patients yet.</p>
      ) : (
        <ul className="patient-list">
          {/* Rendering a list = map an array of data to an array of elements.
              React accepts an array of elements anywhere it accepts one.

              mapping here is essentially iterating through the patients array
              and making a list item for each */}
          {patients.map((p) => (
            <li key={p.id} className="patient">
              <span className="patient-name">{p.name}</span>
              <span className="patient-complaint">{p.chiefComplaint}</span>
              <span className={`tag tag-${p.department}`}>{p.department}</span>
              <button
                type="button"
                className="patient-remove"
                aria-label={`Discharge ${p.name}`}
                onClick={() => onRemove(p.id)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

// `key` is required on anything produced by .map(), and it matters more than it
// looks. It's how React matches elements across re-renders: without it, React
// pairs them up by position, so deleting the first patient makes it think every
// remaining row "changed" rather than that one row was removed.
//
// Use a stable id from the data — never the array index, which shifts the moment
// anything is inserted, removed, or reordered.

// allows files outside to see the body function
// this is a style choice to have all the exports at the bottom, we could
// have included the export keyword in the function header
export default Body;
