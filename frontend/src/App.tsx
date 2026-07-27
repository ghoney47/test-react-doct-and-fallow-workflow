import { useState, useEffect } from "react";
import type { Patient, NewPatient, DepartmentFilter } from "./types.ts";
import { getPatients, createPatient, deletePatient } from "./api/patients.ts";
import Header from "./components/Header.tsx";
import Body from "./components/Body.tsx";

function App() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState<DepartmentFilter>("all"); //either a department title, or "all"

  // useEffect = "do something that isn't rendering." Rendering is supposed to be
  // pure — take state, return markup, touch nothing else. Fetching breaks that
  // rule, so it goes in here instead of in the function body.
  //
  // Listening to the department value, and will execute on department change
  //
  useEffect(() => {
    // This flag is the fix for a race condition, and the race is real: click
    // ED then immediately General, and you have two requests in flight. If the
    // ED response happens to land second, you end up looking at ED patients
    // with "General" highlighted. Slower networks make it likely, not rare.
    //
    // Every effect gets its own `cancelled`. When `department` changes React
    // runs the cleanup below FIRST, flipping the old effect's flag, so the
    // stale response arrives and gets thrown away.
    let cancelled = false;

    // "all" is our word, not the backend's — sending no department means
    // "everything", which is exactly what getPatients() does with undefined.
    getPatients(department === "all" ? undefined : department)
      .then((p) => {
        if (cancelled) return;
        setPatients(p);
        // Clear any previous error on success — otherwise a failed fetch would
        // keep showing its message forever, even after a later one worked.
        //
        // This has to live in the callback, not in the effect body. Calling a
        // setter synchronously in an effect renders, then immediately renders
        // again — the react-hooks lint rule rejects it, and it's right to.
        setError(null);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    // The cleanup function. React calls it before running this effect again,
    // and once more when the component unmounts.
    //
    // ponytail: a flag, not an AbortController. This ignores the stale
    // response; AbortController would actually cancel the request. Upgrade if
    // the wasted requests ever matter — for a local list fetch they don't.
    return () => {
      cancelled = true;
    };

    // The dependency array. `[department]` = run after the first render, and
    // again after any render where `department` changed. That single word is
    // the entire filter mechanism: change the state, the data refetches.
    //
    // Omit the array entirely and this runs after EVERY render:
    // fetch → setPatients → re-render → fetch → forever.
  }, [department]);

  // SA-01
  // Refresh board every 30 seconds
  useEffect(() => {
    setInterval(() => {
      getPatients(department === "all" ? undefined : department)
        .then(setPatients)
        .catch(() => {});
    }, 30000); // no return (cleanup) function, causes multiple timers to be created and would run simulaneously
  }, [department]);

  // SA-02
  // Show the current count in the browser tab.
  useEffect(() => {
    document.title = `Patient Board — ${patients.length} in ${department}`;
  }, []);

  // SA-03
  // Discharge: drop the patient from the board once the server confirms.
  async function handleRemove(id: number) {
    try {
      await deletePatient(id);
      const i = patients.findIndex((p) => p.id === id);
      patients.splice(i, 1); // modifying in place will NOT cause a react re-render
      setPatients(patients); // here we need to rebuild the array without the particular id
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove patient");
    }
  }

  // The other half of "data down, events up". PatientForm collects the fields
  // and calls this; App owns the list, so App decides what a new patient means.
  async function handleAdd(input: NewPatient) {
    try {
      // We use the patient the SERVER returns, not the one we sent. It's the
      // only thing that has the real id, and the id is what `key` depends on.
      const created = await createPatient(input);

      // Only show it if it belongs in the current view. Without this check,
      // adding a General patient while filtered to ED would drop it into the
      // ED list — visible, wrong, and gone on the next refetch.
      if (department !== "all" && created.department !== department) return;

      // The functional form: `prev` is whatever the current value is at the
      // moment React applies the update, rather than the `patients` captured
      // by this particular render.
      setPatients((prev) => [...prev, created]);
    } catch (e) {
      // `e` is typed `unknown` in a catch block — TypeScript refuses to assume
      // what was thrown, since JavaScript lets you throw anything. So we have
      // to narrow it before touching .message.
      setError(e instanceof Error ? e.message : "Could not add patient");
    }
  }

  return (
    <>
      <Header
        department={department}
        onDepartmentChange={setDepartment}
        count={patients.length}
      />
      <Body
        patients={patients}
        error={error}
        onAdd={handleAdd}
        onRemove={handleRemove}
      />
    </>
  );
}

export default App;
