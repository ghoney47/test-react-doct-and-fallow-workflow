import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import {
  createPatientSchema,
  updatePatientSchema,
  movePatientSchema,
  departmentSchema,
} from "../patients/patients.schema.js";
import * as patientsStore from "../patients/patients.store.js";

const patients = new Hono();

// Gets the patients; either all with no input, or just the department specified
patients.get(
  "/",
  zValidator("query", z.object({ department: departmentSchema.optional() })),
  (c) => {
    // destructuring the department value from the larger context object to just store that
    const { department } = c.req.valid("query"); // c is the context object which gets validated here and held as a department
    return c.json(patientsStore.getAll(department)); // calls the store layer for the actual logic, and returns
  },
);

// Creates a patient based on the create schema
patients.post("/", zValidator("json", createPatientSchema), (c) => {
  const input = c.req.valid("json"); //validating intial input
  const patient = patientsStore.create(input); //calling store layer with that json object
  return c.json(patient, 201); // returns patient and a positive 201 created code
});

// Gets patient based on id specified as a query parameter in the https call
patients.get("/:id", (c) => {
  const id = Number(c.req.param("id")); // validating type
  const patient = patientsStore.getById(id); // calling store layer to get patient
  if (!patient) return c.json({ error: "not found" }, 404); // returning 404 error if patient DNE
  return c.json(patient);
});

// Updates the patient object based on id
patients.patch("/:id", zValidator("json", updatePatientSchema), (c) => {
  const id = Number(c.req.param("id")); // validating type
  const changes = c.req.valid("json"); // validating json object for updates
  const patient = patientsStore.update(id, changes); // calling store layer updates
  if (!patient) return c.json({ error: "not found" }, 404);
  return c.json(patient);
});

// Moves patients with specific move schema (though still a patch call)
patients.patch("/:id/move", zValidator("json", movePatientSchema), (c) => {
  const id = Number(c.req.param("id"));
  const changes = c.req.valid("json");
  const patient = patientsStore.move(id, changes);
  if (!patient) return c.json({ error: "not found" }, 404);
  return c.json(patient);
});

patients.delete("/:id", (c) => {
  const id = Number(c.req.param("id"));
  const removed = patientsStore.remove(id);
  if (!removed) return c.json({ error: "not found" }, 404);
  return c.body(null, 204);
});

export default patients;
