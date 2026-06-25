# test-react-doct-and-fallow-workflow

##### Objective:
Developing a CI/CD pipeline that automatically evaluates and rates code quality before deployment. This involves setting up static analysis tools, integrating them into GitHub Actions, and building a sample project to test everything against.


## Initial Research and Setup
---
### React Doctor
##### Install Command



To install React Doctor as a Github Action there are two methods:
1) If using an agentic coding tool use the agent prompt specified at in the [doc](https://www.react.doctor/docs/ci-and-prs/github-actions-setup)
2) Using manual setup refer to this [doc](https://www.react.doctor/docs/ci-and-prs/github-actions-setup) which outlines creating a new branch in the repo and creating a `.github/workflows` package with `react-doctor.yaml` file which is the file shown below. Then commit on the branch and create a PR against the main and the CI will run
```
name: React Doctor

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
  push:
    branches: [main]

permissions:
  contents: read
  pull-requests: write
  issues: write
  statuses: write

concurrency:
  group: react-doctor-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  react-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: millionco/react-doctor@v2
```

For initial setup, we can specify to look at all our files, not just new PRs, so under the `with` in `uses` section in the larger `jobs` section we can add:
```
- uses: millionco/react-doctor@v2
  with:
    blocking: none # or: warning or error
    scope: full # or: changed
```

`blocking: none` will report issues without failing check, `scope: full` looks at the entire project instead of just the PRs. This `.yaml` will also be able to alter permissions, etc. [doc](https://www.react.doctor/docs/reference/github-action-reference)
##### Configuration Details
React Doctor can be configured with a `doctor.config.*` file or the `reactDoctor` key in `package.json`

For complete config details and keys see [doc](https://www.react.doctor/docs/configuration/config-files)

##### How to focus on errors/security only
To focus on security only, add a `categories` section to the config. This will let the control of the five buckets: `Security`, `Bugs`, `Performance`, `Accessibility`, and `Maintainability`. To focus just on security we could add:
```
  "categories": {
    "Security": "error",
    "Bugs": "off",
    "Performance": "off",
    "Accessibility": "off",
    "Maintainability": "off"
  }
```
The three flag settings are `off`, `warn`, and `error`
##### Output Format

##### Github Actions Support

##### Pricing

##### Exit Codes

---
### Fallow
##### Install Command

##### Configuration Details

##### How to focus on errors/security only

##### Output Format

##### Github Actions Support

##### Pricing

##### Exit Codes

---

##### OTHER TOOLS (2-3)
##### Install Command

##### Configuration Details

##### How to focus on errors/security only

##### Output Format

##### Github Actions Support

##### Pricing

##### Exit Codes
---


## Sample Project Specs

###### Tech Stack
- Typescript
- Vite
- Hono
- React



