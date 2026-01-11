# AI Agent Guide for `playpokerodds`

This document provides context and instructions for AI agents working on the
`playpokerodds` repository.

## Project Overview

`playpokerodds` is a monorepo containing services for the
[playpokerodds.com](https://playpokerodds.com) platform. It uses a mix of
Node.js (Angular, Express) and Deno technologies.

## Repository Structure

The code is located in the `src` directory, structured as follows:

- **`src/ui`**: Angular frontend application.
- **`src/web-api`**: Backend REST API built with Express and TypeScript
  (Node.js).
- **`src/core`**: shared domain logic and types. Published as
  `@moby-it/poker-core` on npm.
- **`src/calc-odds-api`**: A specialized, high-performance microservice for
  calculating winning odds. Built with **Deno**.

## Technology Stack

- **Frontend**: Angular
- **Backend**: Node.js, Express, TypeScript
- **Microservices**: Deno (for CPU-intensive tasks)
- **Infrastructure**: Docker, Docker Compose

## Development & Operations

- **Running the stack**: Use the `run.sh` script, which wraps
  `docker compose build && docker compose up -d`.
- **Dependencies**: Access to a private npm registry is required for some
  packages.

## Guidelines for Agents

1. **Context Awareness**: Be aware of the mixed environment (Node.js vs Deno).
   verify which service you are editing before suggesting imports or commands
   (e.g., `npm` vs `deno`).
2. **Shared Logic**: Transformations to core business logic should likely happen
   in `src/core` and be propagated to other services.
3. **Performance**: The `calc-odds-api` is performance-critical. Optimization is
   a priority there.
