//! Durable outbox for anything that leaves the machine — MiMaS submissions,
//! WhatsApp/SMS, QR verification sync (PLAN §18, Phase 8). Writes land in
//! SQLite first and are retried until acknowledged; nothing is ever only
//! in memory.
