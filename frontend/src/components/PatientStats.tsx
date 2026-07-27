import { useMemo, useState } from "react";
import type { Patient } from "../types.ts";

// A collapsible summary strip above the list: how many patients per department,
// plus whatever came in most recently.
type PatientStatsProps = {
  patients: Patient[];
  title: string;
};

function PatientStats({ patients, title }: PatientStatsProps) {
  // SA-08
  const [heading] = useState(title); // remove, things computed from props shouldn't live in a state hook, would cause this title to freeze on the first mounted title
  const [open, setOpen] = useState(true);

  // SA-10
  const byDepartment = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of patients)
      counts[p.department] = (counts[p.department] ?? 0) + 1;
    return Object.entries(counts);
  }, [patients.map((p) => p.department)]); // depenency array must hold stable references 

  // SA-06
  // the row component being called within the PatientStats would cause a new Row component to be created each render
  // this would cause all internal row states to be lost, it would throw away everything
  // calling components inside other components cause these bad cascading behaviors
  function Row({ label, value }: { label: string; value: number }) {
    return (
      <li className="stat">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
      </li>
    );
  }

  const latest = patients[patients.length - 1];

  // the stats toggle should be changed to a button because it would allow keyboard only access
  // and allow for screen readers to have a descriptive idea of the component
  // prefer the native interactive element when possible
  return (
    <section className="stats">
      {/* SA-07 */}
      <div className="stats-toggle" onClick={() => setOpen(!open)}>
        {heading} {open ? "▾" : "▸"}
      </div>

      {open && (
        <ul className="stat-list">
          {/* SA-04 */}
          {byDepartment.map(([label, value], i) => (
            <Row key={i} label={label} value={value} /> //keying on local index, this would would cause incorrect mappings if the index changes
          ))}
        </ul>
      )}

      {/* SA-05 */}
      {latest && (
        <p
          className="stats-latest"
          dangerouslySetInnerHTML={{
            // unnecessary and dangerous use of this call, attacker could insert code and the html would run without being checked on the HTML side
            __html: `Latest arrival: <b>${latest.name}</b> — ${latest.chiefComplaint}`,
          }}
        />
      )}
    </section>
  );
}

export default PatientStats;
