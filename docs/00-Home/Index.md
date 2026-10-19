---
tags:
  - moc
---

# Index — fullstack-template Knowledge Base

A pnpm + Turborepo monorepo: a NestJS API, a React SPA, and a typed API client generated from the
API's own OpenAPI spec — so a backend contract change breaks the frontend build instead of
production.

> [!info] Two apps, one contract The API ([[Backend]]) owns the database schema and the HTTP
> contract. The web app ([[Frontend]]) consumes it only through the generated client. The pipeline
> that connects them is [[System-overview]], and the decision behind it is
> [[0001-contract-first-openapi]].

> [!important] The code is the source of truth This vault explains _why_ and _how we work_. For what
> the system does right now, read the code — see [[AGENTS|the source priority rules]]. Work in
> progress lives in `../specs/`, not here.

## Start here

- [[Local-setup]] — get it running
- [[Tech-stack]] — what is installed and which versions
- [[Glossary]] — terms used across this vault
- [[Workflow]] — branches, the feature cycle, how Claude is set up

## Architecture

- [[System-overview]] — how the pieces connect and how to change the contract
- [[Backend]] · [[Frontend]] — one MOC per app

## Features

One page per feature, end to end — index and conventions in [[Features]]. None yet; the first one is
created from [[Feature|99-Templates/Feature]] during the `build` phase of the
[[Workflow|feature cycle]].

## Decisions

- [[0001-contract-first-openapi]] — types are generated from the spec, never hand-written
- [[0002-two-long-lived-branches]] — `master` + `development`, everything else short-lived
- [[0003-hooks-enforce-not-prose]] — anything that must not slip is a hook, not a rule in CLAUDE.md

## Cross-cutting

- [[Workflow]] — git model, the SDD cycle, agents and hooks
- [[Deploy]] — building and serving it

## Sources

Facts trace back to primary sources in [[Sources]]; raw originals are filed under
`sources/raw/YYYY-MM-DD/`. Unprocessed material waits in [[Inbox]]. The change log is [[Journal]],
and the rules for editing all of this are [[AGENTS]].
