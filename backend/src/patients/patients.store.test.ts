import { beforeEach, describe, expect, it, vi } from "vitest";

// The store keeps `patients` and `nextId` as module-level state with no reset
// export, so each test re-imports the module to get a clean array.
let store: typeof import("./patients.store.js");

const alice = {
  name: "Alice",
  dob: "1990-01-01",
  chiefComplaint: "chest pain",
  department: "ED" as const,
};
const bob = {
  name: "Bob",
  dob: "1985-06-15",
  chiefComplaint: "sore throat",
  department: "general" as const,
};

beforeEach(async () => {
  vi.resetModules();
  store = await import("./patients.store.js");
});

describe("create", () => {
  it("assigns server-owned fields and keeps the input", () => {
    const patient = store.create(alice);

    expect(patient).toMatchObject(alice);
    expect(patient.id).toBe(1);
    expect(patient.departureTime).toBeNull();
    expect(new Date(patient.arrivalTime).toISOString()).toBe(
      patient.arrivalTime,
    );
  });

  it("increments ids across patients", () => {
    expect(store.create(alice).id).toBe(1);
    expect(store.create(bob).id).toBe(2);
  });
});

describe("getAll", () => {
  it("returns every patient when no department is given", () => {
    store.create(alice);
    store.create(bob);

    expect(store.getAll()).toHaveLength(2);
  });

  it("filters by department", () => {
    store.create(alice);
    store.create(bob);

    expect(store.getAll("ED").map((p) => p.name)).toEqual(["Alice"]);
    expect(store.getAll("general").map((p) => p.name)).toEqual(["Bob"]);
  });
});

describe("getById", () => {
  it("finds an existing patient", () => {
    const created = store.create(alice);

    expect(store.getById(created.id)).toBe(created);
  });

  it("returns undefined for an unknown id", () => {
    expect(store.getById(999)).toBeUndefined();
  });
});

describe("update", () => {
  it("applies only the given changes", () => {
    const created = store.create(alice);

    const updated = store.update(created.id, { chiefComplaint: "headache" });

    expect(updated?.chiefComplaint).toBe("headache");
    expect(updated?.name).toBe("Alice");
    expect(store.getById(created.id)?.chiefComplaint).toBe("headache");
  });

  it("returns undefined for an unknown id", () => {
    expect(store.update(999, { name: "Nobody" })).toBeUndefined();
  });
});

describe("move", () => {
  it("changes the department", () => {
    const created = store.create(alice);

    expect(store.move(created.id, { department: "general" })?.department).toBe(
      "general",
    );
    expect(store.getAll("ED")).toHaveLength(0);
  });

  it("returns undefined for an unknown id", () => {
    expect(store.move(999, { department: "ED" })).toBeUndefined();
  });
});

describe("remove", () => {
  it("deletes the patient and reports success", () => {
    const created = store.create(alice);
    store.create(bob);

    expect(store.remove(created.id)).toBe(true);
    expect(store.getById(created.id)).toBeUndefined();
    expect(store.getAll().map((p) => p.name)).toEqual(["Bob"]);
  });

  it("returns false for an unknown id", () => {
    store.create(alice);

    expect(store.remove(999)).toBe(false);
    expect(store.getAll()).toHaveLength(1);
  });
});
