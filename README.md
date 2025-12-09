# Project #1

## Overview

The "MegaBlog" backend must be architected for massive scale to handle up to 1 million concurrent readers and highly bursty write traffic (such as likes and reactions). The goal is to avoid standard CRUD patterns that will fail at this scale, by implementing advanced architectural techniques including Write-Back Caching, Asynchronous Delegation, and Soft Deletes. The following technical specifications and constraints must be strictly followed.

## Technical Specifications & Constraints

### Module A: Optimized Storage Layer ("Physical" Design)

- **Constraint 1: Timestamps**
    - Do **not** use SQL `DATETIME` or `TIMESTAMP` types for the `published_at` field.
    - **Must use `BigInt` (Epoch Seconds)** for timestamp storage. This optimizes range queries and minimizes CPU cycles.

- **Constraint 2: Soft Deletes**
    - All deletions must be **soft deletes**. Add an `is_deleted` flag; the DELETE endpoint must not physically remove the row.
    - Implement a **Garbage Collector script** that runs during off-peak hours: this script physically deletes rows that have been marked as deleted for more than 30 days, to reduce index fragmentation.

- **Constraint 3: The "Fat Row" Problem**
    - To optimize disk I/O, do **not** store the blog post content (`body`) directly in the main SQL table.
    - Store the large body text (simulating 5MB+ per post) in a simulated Blob Store (such as local filesystem or S3).
    - The SQL table should only contain a reference pointer or URL to the body content.

### Module B: The Caching Layer

- **Constraint 4: Read Strategy**
    - Implement a **Cache-Aside (Write-Around) pattern** for blog detail retrieval.
    - **On cache hit:** Serve data from Redis.
    - **On cache miss:** Fetch from SQL and Blob Store, combine the data, cache the result, and return it.

- **Constraint 5: Write Strategy ("Like" Button)**
    - Implement a **Write-Back Cache** for the like count.
    - When a user likes a post, the API must respond in **under 20ms**.
    - Increment the like counter in Redis immediately.
    - Periodically (e.g., every 10 seconds), a background worker flushes counters to the SQL database **asynchronously**. Do not update SQL on every HTTP request.

### Module C: Search & Delegation

- **Constraint 6: Delegation**
    - **Do not** use SQL for fuzzy text search. All fuzzy text search must be handled by **ElasticSearch**.

- **Constraint 7: Asynchronous Sync**
    - When a blog post is created or updated, **do not** write to ElasticSearch synchronously (to avoid request latency).
    - Instead, push an event to a **Message Queue** (such as BullMQ).
    - A separate **Worker Process** consumes events from the queue, fetches and cleans the data, and indexes it in ElasticSearch.

### Module D: API & Communication

- **Constraint 8: Timezones**
    - The API must accept generic ISO-formatted time strings from clients.
    - All timestamps must be stored and processed strictly in UTC.

- **Constraint 9: Normalization**
    - Tags must be stored in a **separate table** using integer IDs (rather than strings), to reduce overhead from string matching and improve search performance.
