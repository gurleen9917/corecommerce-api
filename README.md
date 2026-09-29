# CoreCommerce – Transactional Inventory & Order Engine

An ACID-compliant order and inventory processing engine built with Node.js, Express, and SQLite. Designed to prevent race conditions, dirty reads, and negative inventory under high-concurrency checkout scenarios.

## Architectural Overview

* *Presentation Tier:* Static frontend dashboard (HTML5, CSS3, Vanilla JS) with real-time audit logging.
* *Application Tier:* Express.js REST API enforcing transactional boundaries and inventory constraints.
* *Persistence Tier:* SQLite operating in *Write-Ahead Logging (WAL)* mode with strict foreign key constraints and schema-level validation (CHECK (stock >= 0)).

## Core Features

* *ACID Transactions:* Full BEGIN / COMMIT / ROLLBACK lifecycle for multi-item checkouts.
* *Race Condition Safe:* Prevents phantom reads and negative inventory during parallel purchases.
* *Compensating Transactions:* Supports order cancellations with automated stock restoration.
* *Concurrency Harness:* Includes a multi-request test harness (test-concurrency.js) validating simultaneous checkout bursts.
