import type { DepartmentFilter } from "../types.ts";

type HeaderProps = {
  // The currently selected filter, owned by App. Header doesn't remember it —
  // it's told what's selected on every render.
  department: DepartmentFilter;
  // ...and given a function to call when the user picks a different one.
  onDepartmentChange: (department: DepartmentFilter) => void;
  count: number;
};

// Defined outside the component so it isn't rebuilt on every render. The
// explicit type annotation is what makes `value` a DepartmentFilter rather than
// a plain `string` — without it, TypeScript would widen it and the onClick
// below wouldn't type-check.
const FILTERS: { value: DepartmentFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "general", label: "General" },
  { value: "ED", label: "ED" },
];

// Header — the bar across the top of every screen.
//
// It renders `<header>`, a real HTML element with built-in meaning: screen
// readers announce it as the page banner. Using it instead of a plain <div>
// is free accessibility, so there's no reason not to.
function Header({ department, onDepartmentChange, count }: HeaderProps) {
  return (
    <header className="header">
      {/* `className`, not `class`. `class` is a reserved word in JavaScript,
          so JSX renames the attribute. Same for `htmlFor` instead of `for`. */}
      <h1>Patient Board</h1>

      {/* This count is why `patients` lives in App. Header and Body are
          siblings — neither can see the other's state — so anything both of
          them need has to live in their common parent. */}
      <span className="header-sub">
        {count} {count === 1 ? "patient" : "patients"}
      </span>

      <div className="filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            // A conditional className. Nothing special about it — just a
            // ternary producing a string, since className takes a string.
            className={f.value === department ? "filter active" : "filter"}
            // The accessible version of "this one is selected". Screen readers
            // announce pressed state; colour alone doesn't reach everyone.
            aria-pressed={f.value === department}
            onClick={() => onDepartmentChange(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
    </header>
  );
}

export default Header;
