import { z } from "zod";
import type { Patient } from "./patients.schema.js";
import {
  createPatientSchema,
  updatePatientSchema,
  movePatientSchema,
} from "./patients.schema.js";

// this store file is where we are storing the data and creating the objects
// data may be stored elsewhere in larger projects, but without a database, we
// are just storing an array of data here

// creating types by pulling from their schemas in order to maintain references
// rather than many types created seperately
type CreatePatientInput = z.infer<typeof createPatientSchema>;
type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
type MovePatientInput = z.infer<typeof movePatientSchema>;

// array to store the patients
// const in typescript locks the binding of variable name, not the mutablilty
// (you cannot have another patients variable within this scope)
const patients: Patient[] = [];
let nextId = 1;

// Returns all the patients, or if department is specified, only those within that
// department.
export function getAll(department?: Patient["department"]): Patient[] {
  if (!department) return patients; //block to specify if we don't have a deparment argument

  //uses a filter w/ lambda function to filter for patients with deparments matching inputted
  return patients.filter((p) => p.department === department); // === is strict equality
}

// Returns patient with id number, otherwise undefined
export function getById(id: number): Patient | undefined {
  return patients.find((p) => p.id === id);
}

// Returns the patient created
// calls the createPatientSchema through the type of CreatePatientInput
export function create(input: CreatePatientInput): Patient {
  const patient: Patient = {
    id: nextId++, //internal id count
    ...input, //unpacks the input into a full form (cleaner syntax)
    arrivalTime: new Date().toISOString(),
    departureTime: null,
  };
  patients.push(patient); //adds to internal array
  return patient;
}

// Returns updated patients
export function update(
  id: number, // which patient to update
  changes: UpdatePatientInput, // updates to the patient object
): Patient | undefined {
  const patient = getById(id);
  if (!patient) return undefined; // breaks if patient doesn't exist
  Object.assign(patient, changes); // assigns the object patient the new values found in changes
  return patient; // returns the updated patient
}

// Moves patient by ID from current department to the specified department
export function move(
  id: number, // which patient to move
  changes: MovePatientInput, // movement schema
): Patient | undefined {
  const patient = getById(id);
  if (!patient) return undefined;
  Object.assign(patient, changes);
  return patient;
}

// Deletes patient from array, returns true/false based on success of task
export function remove(id: number): boolean {
  const index = patients.findIndex((p) => p.id === id); //returns -1 if not found
  if (index === -1) return false;
  patients.splice(index, 1); // splice(start, deleteCount) will start at the index, and delete 1 value
  return true;
}
