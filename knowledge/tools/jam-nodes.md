---
title: "jam-nodes"
type: tool
date_added: 2026-02-14
source: "https://github.com/wespreadjam/jam-nodes"
tags: [typescript, workflow, automation, nodes, zod]
via: "Twitter bookmark from @jia_seed"
---

Extensible workflow node framework for building automation pipelines. Define, register, and execute typed nodes with Zod validation. Part of the jam ecosystem being open sourced by jia and mohammad.

## Key Features

- **Typed Node System**: Define nodes with input/output schemas using Zod validation
- **Built-in Nodes**: Conditional logic, delays, filters, maps, HTTP requests
- **Variable Interpolation**: Powerful context system with JSONPath support
- **Node Categories**: Action, logic, integration, and transform nodes
- **Execution Context**: Share data between nodes with nested path resolution
- **Extensible**: Easy to create custom nodes with typed inputs/outputs

## Core Packages

- `@jam-nodes/core` - Core framework with types, registry, and execution context
- `@jam-nodes/nodes` - Built-in nodes (conditional, delay, filter, map, http-request)

## Use Cases

- Automation pipelines
- Workflow orchestration
- MCP server workflows (used by OpenClaw agents)
- Multi-step data processing

## Links

- [GitHub](https://github.com/wespreadjam/jam-nodes)
- [Original Tweet](https://x.com/jia_seed/status/2022761956566818908)
