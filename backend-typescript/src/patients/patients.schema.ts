import { z } from "zod";
// schema only deals with data validation
// Think of the schema layer here as verifying what 'valid' data looks like for each particular call

// creates enumeration for the possible departments
export const departmentSchema = z.enum(["general", "ED"]);

// patient fields
export const patientSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  dob: z.string(),
  chiefComplaint: z.string().min(1),
  department: departmentSchema,
  arrivalTime: z.string(),
  departureTime: z.string().nullable(),
});

// creating each type through `z.infer<>` which takes the schema
// and makes it into a typescript type
// allows for one place of truth, so everything refers back to the schema
export type Department = z.infer<typeof departmentSchema>;
export type Patient = z.infer<typeof patientSchema>;

// POST body: server assigns id, arrivalTime (now), departureTime (null)
// the pick call takes zod object `patientSchema` and returns a new schema containing only the fields you list
// basically picking the values we need to fill for the creation of the patient (creation not done at this step)
export const createPatientSchema = patientSchema.pick({
  name: true,
  dob: true,
  chiefComplaint: true,
  department: true,
});

// PATCH body: the "modify" action - name/dob/CC/times only, not department
// similar to above, but we are ensuring we get the proper inputs to make an update call, doesn't
// actually update the body however
export const updatePatientSchema = patientSchema
  .pick({
    name: true,
    dob: true,
    chiefComplaint: true,
    arrivalTime: true,
    departureTime: true,
  })
  .partial();

// we only need one input to move, so we only pick the department field
// separate from update: the "move" action only ever changes department
export const movePatientSchema = patientSchema.pick({ department: true });
