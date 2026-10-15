// The large-Err signatures (Response payloads in Result) mirror the TS
// middleware-chain patterns this port preserves; boxing them everywhere would
// obscure the contract mapping for no runtime gain at this scale.
#![allow(clippy::result_large_err)]

pub mod auth;
pub mod odds;
pub mod db;
pub mod domain;
pub mod routes;
pub mod state;
