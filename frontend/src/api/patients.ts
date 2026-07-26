// The API layer: one function per backend endpoint.
//
// Nothing in this file knows React exists. It's plain async functions that take
// arguments and return data. That separation is the point — components decide
// *when* to fetch, this file decides *how*.

import type {
  Patient,
  Department,
  NewPatient,
  PatientUpdate,
} from "../types.ts";

// `import type` (not plain `import`) tells TypeScript these are types only, so
// the import disappears entirely from the compiled JavaScript. This project has
// `verbatimModuleSyntax` on, which makes it a hard requirement, not a style choice.

// Relative, not "http://localhost:3000". Vite's dev proxy forwards /patients to
// the backend (see vite.config.ts), so the browser thinks it's a same-origin request.
const BASE = "/patients";

// A shared wrapper around fetch. Six endpoints would otherwise repeat the same
// four lines of error handling, and repeated error handling is how one copy
// quietly ends up missing.
//
// `<T>` is a *generic* — a type the caller fills in. `request<Patient>(...)`
// returns a `Promise<Patient>`; `request<Patient[]>(...)` returns a promise of
// an array. One function, correctly typed for every endpoint.
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options, // spread last so a caller's own headers/method win
  });

  // IMPORTANT: fetch does NOT throw on 404 or 500. It only rejects if the
  // request never completed at all (network down, DNS failure). A 404 is a
  // perfectly successful HTTP round-trip as far as fetch is concerned, so
  // without this check a "not found" would sail through as if it were data.
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${options?.method ?? "GET"} ${BASE}${path}`);
  }

  // DELETE replies 204 No Content with an empty body. Calling res.json() on an
  // empty body throws a parse error, so bail out first.
  //
  // `as T` is a type assertion: we're telling the compiler "trust me" because
  // it can't verify this itself. It's only sound because the one caller that
  // hits this branch asks for T = void. Assertions are an escape hatch — worth
  // recognising, worth being suspicious of.
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// GET /patients — every patient, or just one department's.
// The `?` makes the parameter optional: getPatients() and getPatients("ED")
// are both valid calls, and TypeScript rejects getPatients("cardiology").
export function getPatients(department?: Department): Promise<Patient[]> {
  return request<Patient[]>(department ? `?department=${department}` : "");
}

// GET /patients/:id
export function getPatient(id: number): Promise<Patient> {
  return request<Patient>(`/${id}`);
}

// POST /patients — the server assigns id and arrivalTime, which is exactly why
// the input is `NewPatient` and not `Patient`.
export function createPatient(input: NewPatient): Promise<Patient> {
  return request<Patient>("", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// PATCH /patients/:id — edit a patient's details. `PatientUpdate` has every
// field optional, so you can send just the one thing you changed.
export function updatePatient(
  id: number,
  changes: PatientUpdate,
): Promise<Patient> {
  return request<Patient>(`/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

// PATCH /patients/:id/move — its own endpoint because moving between
// departments is a distinct action, not just another field edit.
export function movePatient(
  id: number,
  department: Department,
): Promise<Patient> {
  return request<Patient>(`/${id}/move`, {
    method: "PATCH",
    body: JSON.stringify({ department }),
  });
}

// DELETE /patients/:id — returns nothing on success, hence `Promise<void>`.
export function deletePatient(id: number): Promise<void> {
  return request<void>(`/${id}`, { method: "DELETE" });
}
