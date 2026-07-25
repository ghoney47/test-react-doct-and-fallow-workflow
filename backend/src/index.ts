import { serve } from "@hono/node-server";
import { Hono } from "hono";
import patients from "./controllers/patients.controllers.js";

const app = new Hono();

app.get("/", (c) => {
  return c.text("This is Test!");
});

app.route("/patients", patients);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
