// The shape of data coming from the backend.
//
// The backend defines these with zod (backend/src/patients/patients.schema.ts)
// and derives its types from those schemas. The frontend only *reads* the JSON,
// so plain TypeScript types are enough here — no zod, no runtime validation.
//
// This file is the one place the frontend describes the API contract. If the
// backend schema changes, this is the file that changes.

// A union of string literals. `Department` can only ever be one of these two
// exact strings — TypeScript will reject `"cardiology"` at compile time.
// This mirrors the backend's `z.enum(["general", "ED"])`.
export type Department = "general" | "ED";

// An object type. Every Patient must have all of these fields, with these types.
export type Patient = {
  id: number;
  name: string;
  dob: string;
  chiefComplaint: string;
  department: Department;
  arrivalTime: string; // ISO timestamp string, e.g. "2026-07-25T14:30:00.000Z"
  departureTime: string | null; // `| null` means: a string, OR null. Nothing else.
};

// What we send to POST /patients. The server fills in id, arrivalTime and
// departureTime itself, so we must not send them.
//
// `Omit<T, K>` is a built-in TypeScript utility: take type T, remove keys K.
// Using Omit instead of retyping the fields means this stays in sync with
// Patient automatically — rename `chiefComplaint` above and this follows.
export type NewPatient = Omit<
  Patient,
  "id" | "arrivalTime" | "departureTime"
>;

// What we send to PATCH /patients/:id. `Partial<T>` makes every field optional,
// so we can send just the fields we're changing.
// The backend does not allow changing department here — that's the move endpoint.
export type PatientUpdate = Partial<
  Omit<Patient, "id" | "department">
>;
