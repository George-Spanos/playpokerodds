//! Shared extraction: bearer token → DecodedJwt. Port of extractUserFromReq.

use crate::auth::verify_jwt;
use crate::domain::DecodedJwt;
use axum::http::HeaderMap;

pub fn extract_token_from_request(headers: &HeaderMap) -> Option<String> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .map(|auth_header| auth_header[7..].to_string())
}

pub fn extract_user_data_from_request(headers: &HeaderMap) -> Option<DecodedJwt> {
    let token = extract_token_from_request(headers)?;
    verify_jwt(&token)
}
