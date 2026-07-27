# test-react-doct-and-fallow-workflow

##### Objective:

Developing a CI/CD pipeline that automatically evaluates and rates code quality before deployment. This involves setting up static analysis tools, integrating them into GitHub Actions, and building a sample project to test everything against.

## Initial Research and Setup

---

### React Doctor

##### Install Command

To install React Doctor as a Github Action there are two methods:

1. If using an agentic coding tool use the agent prompt specified at in the [doc](https://www.react.doctor/docs/ci-and-prs/github-actions-setup)
2. Using manual setup refer to this [doc](https://www.react.doctor/docs/ci-and-prs/github-actions-setup) which outlines creating a new branch in the repo and creating a `.github/workflows` package with `react-doctor.yaml` file which is the file shown below. Then commit on the branch and create a PR against the main and the CI will run

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

JSON or Human readable in the CLI

##### Github Actions Support

Native

##### Pricing

Team plan is 30/mo, enterprise pricing exists, but a meeting with spokesperson is required.

---

### Fallow

This [adoption](https://fallow.tools/docs/adoption/) documentation is a helpful guide to starting to understand what a config could initially look like and some first steps

##### Install Command

If running directly, use a direct install

```
npm install -g fallow
```

Branch from main, then create a `.yaml` file in the `.github/workflows` package. Then commit and push this change. Then we open a PR against main and merge.

##### Output formats

- For human readable output, `npx fallow audit --format json` to make machine readable json
- For quality scoring + refactor targets `npx fallow health --score --hotspots --targets`
- Cleanup-specific `npx fallow dead-code`

##### Configuration Details

The config is only available with the pro tier and higher, and the highest priority config file is:
`.fallowrc.json` followed by others as seen in the [doc](https://fallow.tools/docs/configuration/overview/)

Moreover, in the config, a `production` mode can be toggled which automatically ignores any test or mock files in the project.

##### How to focus on errors/security only

Fallow looks to isolate dead code, duplicated code, and architecture boundaries, in the documentation there is nothing specifically pointing to it as a tool for security, though their features can be turned on an off with the following addition to the config:

```
{
  "production": {
    "deadCode": false,
    "health": true,
    "dupes": false
  }
}
```

##### Github Actions Support

Native see: [doc](https://fallow.tools/docs/integrations/ci/)

##### Exit Codes

- 0. No errors found
- 1. Errors found
- 2. Fatal Error (parse failure, invalid config)

##### Pricing

- Free tier does not allow for the use of a Config file.
- Pro tier is $20/dev/mon
- Enterprise is not listed, must contact sales team

---

##### Additional Tools:

### CodeQL From GitHub

**PRIVATE REPO USAGE ONLY WITH GITHUB TEAM/ENTERPRISE**

##### Install Command

Install by creating a `.github/workflows/codeql-analysis.yml` file and PR to main.
Because native GitHub, use github workflow [docs](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#on), and specifiy when the action should fire.

File used in this test (default code scanner) found in Security and quality tab -> CodeQL:

```yml
n# For most projects, this workflow file will not need changing; you simply need
# to commit it to your repository.
#
# You may wish to alter this file to override the set of languages analyzed,
# or to provide custom queries or build logic.
#
# ******** NOTE ********
# We have attempted to detect the languages in your repository. Please check
# the `language` matrix defined below to confirm you have the correct set of
# supported CodeQL languages.
#
name: "CodeQL Advanced"

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  schedule:
    - cron: '26 23 * * 4'

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    # Runner size impacts CodeQL analysis time. To learn more, please see:
    #   - https://gh.io/recommended-hardware-resources-for-running-codeql
    #   - https://gh.io/supported-runners-and-hardware-resources
    #   - https://gh.io/using-larger-runners (GitHub.com only)
    # Consider using larger runners or machines with greater resources for possible analysis time improvements.
    runs-on: ${{ (matrix.language == 'swift' && 'macos-latest') || 'ubuntu-latest' }}
    permissions:
      # required for all workflows
      security-events: write

      # required to fetch internal or private CodeQL packs
      packages: read

      # only required for workflows in private repositories
      actions: read
      contents: read

    strategy:
      fail-fast: false
      matrix:
        include:
        - language: actions
          build-mode: none
        - language: javascript-typescript
          build-mode: none
        # CodeQL supports the following values keywords for 'language': 'actions', 'c-cpp', 'csharp', 'go', 'java-kotlin', 'javascript-typescript', 'python', 'ruby', 'rust', 'swift'
        # Use `c-cpp` to analyze code written in C, C++ or both
        # Use 'java-kotlin' to analyze code written in Java, Kotlin or both
        # Use 'javascript-typescript' to analyze code written in JavaScript, TypeScript or both
        # To learn more about changing the languages that are analyzed or customizing the build mode for your analysis,
        # see https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning.
        # If you are analyzing a compiled language, you can modify the 'build-mode' for that language to customize how
        # your codebase is analyzed, see https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/codeql-code-scanning-for-compiled-languages
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    # Add any setup steps before running the `github/codeql-action/init` action.
    # This includes steps like installing compilers or runtimes (`actions/setup-node`
    # or others). This is typically only required for manual builds.
    # - name: Setup runtime (example)
    #   uses: actions/setup-example@v1

    # Initializes the CodeQL tools for scanning.
    - name: Initialize CodeQL
      uses: github/codeql-action/init@v4
      with:
        languages: ${{ matrix.language }}
        build-mode: ${{ matrix.build-mode }}
        # If you wish to specify custom queries, you can do so here or in a config file.
        # By default, queries listed here will override any specified in a config file.
        # Prefix the list here with "+" to use these queries and those in the config file.

        # For more details on CodeQL's query packs, refer to: https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/configuring-code-scanning#using-queries-in-ql-packs
        # queries: security-extended,security-and-quality

    # If the analyze step fails for one of the languages you are analyzing with
    # "We were unable to automatically build your code", modify the matrix above
    # to set the build mode to "manual" for that language. Then modify this step
    # to build your code.
    # ℹ️ Command-line programs to run using the OS shell.
    # 📚 See https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun
    - name: Run manual build steps
      if: matrix.build-mode == 'manual'
      shell: bash
      run: |
        echo 'If you are using a "manual" build mode for one or more of the' \
          'languages you are analyzing, replace this with the commands to build' \
          'your code, for example:'
        echo '  make bootstrap'
        echo '  make release'
        exit 1

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v4
      with:
        category: "/language:${{matrix.language}}"

```

To specify the language to scan we add under uses ->

```yml
- uses: github/codeql-action/init@v4
  with:
    languages: javascript-typescript
```

Also with multiple languages:

```yml
jobs:
  analyze:
    name: Analyze
    ...
    strategy:
      fail-fast: false
      matrix:
        include:
          - language: javascript-typescript
            build-mode: none
          - language: python
            build-mode: none

```

In the YAML file

##### Configuration Details

The YAML file can specify packs and queries (and can be treated as a config file), or a custom config file can be used.

Specify this in the initial `.yml` file in the workflow package as such:

```
- uses: github/codeql-action/init@v4
  with:
    config-file: ./.github/codeql/codeql-config.yml

```

Then you can add to the config as such:

```
- uses: github/codeql-action/init@v4
  with:
    languages: ${{ matrix.language }}
    config: |
      disable-default-queries: true
      threat-models: local
      queries:
        - uses: security-extended
      query-filters:
        - exclude:
            tags: /cwe-020/
```

Advanced setup is also available on GitHub [doc](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning)

##### How to focus on errors/security only

The CI integration natively only focuses on code security.

##### Output Format

Output can be specified to be SARIF

##### Github Actions Support

Native

##### Pricing

Comes with the GitHub actions pricing

##### Exit Codes

0 - success
1 - successful answer no
2 - something went wrong
[3 and onward](https://docs.github.com/en/code-security/reference/code-scanning/codeql/codeql-cli/exit-codes)

---

### Semgrep

Install was completed through the Semgrep dashboard where a GitHub account can be linked and the CI workflow is added to a selected project

##### Install

Adding a `semgrep.yml` file to repo.
see [doc](https://docs.semgrep.dev/deployment/add-semgrep-to-ci#github-actions) for details on the github actions connection as well.

##### Config details

The config is done in the `.yml` file. In the config we can specify schedule, branches, runner, etc.
This [doc](https://docs.semgrep.dev/semgrep-ci/sample-ci-configs#sample-github-actions-configuration-file) has a good starter config which could be further specialized.

#### Error/security focus

The scan is by default security focused. The severity can be altered to error, warn, or info in the `.yml` file:

```
- run: semgrep ci --severity ERROR
```

#### Output Format

Many output forms available, use flags in the CLI `--text` for human readable or `--json` for JSON format.

In the workflow file add to the `run` section

```
- run: semgrep ci --json --json-output=semgrep.json
```

and upload to github advanced security

```
- uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: semgrep.sarif
```

or as an artifact

```
- uses: actions/upload-artifact@v3
  with:
    name: semgrep-results
    path: semgrep.sarif
```

#### Github Actions Support

Available

#### Pricing

- At a team level $30/month; not listed at enterprise level

#### Exit Codes

Semgrep can finish with the following exit codes: 0) Semgrep ran successfully and found no errors (or did find errors, but the --error flag is not being used).

1. Semgrep ran successfully and found issues in your code (while using the --error flag).
2. Semgrep failed.
3. Invalid syntax of the scanned language. This error occurs only while using the --strict flag.
4. Semgrep encountered an invalid pattern in the rule schema.
   5): Semgrep configuration is not valid YAML.
   7)At least one rule in the configuration is invalid.
5. Semgrep does not understand specified language.
6. The API key is invalid.
7. [Deprecated] Semgrep scan failed.

---

## Sample Project Specs

###### Tech Stack

- Typescript
- Vite
- Hono
- React
