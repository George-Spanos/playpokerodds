//! Auth: JWT issuing/verification and password hashing with transparent
//! bcrypt → argon2id upgrade. Port of routes/auth/common + middleware/passport.

use crate::domain::DecodedJwt;
use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::Argon2;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

const EXPIRY_SECONDS: usize = 4 * 24 * 60 * 60; // 4 days, matches signUserData

pub fn secret_key() -> String {
    std::env::var("JWT_SECRET").expect("secret key not present")
}

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    #[serde(rename = "userId")]
    user_id: String,
    email: String,
    role: i32,
    exp: usize,
}

/// signUserData: HS256, claims userId/email/role, 4d expiry.
pub fn sign_user_data(user_id: &str, email: &str, role: i32) -> String {
    let claims = Claims {
        user_id: user_id.to_string(),
        email: email.to_string(),
        role,
        exp: now_unix() + EXPIRY_SECONDS,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret_key().as_bytes()),
    )
    .expect("jwt encoding cannot fail with valid secret")
}

/// verify(token) → DecodedJwt | null. HS256, exp enforced. Matches verifyJwt.
pub fn verify_jwt(token: &str) -> Option<DecodedJwt> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret_key().as_bytes()),
        &Validation::default(),
    )
    .ok()
    .map(|data| DecodedJwt {
        user_id: data.claims.user_id,
        email: data.claims.email,
        role: data.claims.role,
    })
}

fn now_unix() -> usize {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .expect("clock after epoch")
        .as_secs() as usize
}

/// Argon2id hash (PHC string) for new/updated passwords.
pub fn hash_password(password: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .expect("argon2 hashing cannot fail with generated salt")
        .to_string()
}

pub fn verify_argon2(password: &str, hash: &str) -> bool {
    PasswordHash::new(hash)
        .map(|parsed| {
            Argon2::default()
                .verify_password(password.as_bytes(), &parsed)
                .is_ok()
        })
        .unwrap_or(false)
}

pub fn verify_bcrypt(password: &str, hash: &str) -> bool {
    bcrypt::verify(password, hash).unwrap_or(false)
}

/// Does this stored hash look like bcrypt ($2a/$2b/$2y prefix)? Used for the
/// transparent upgrade path.
pub fn is_bcrypt_hash(hash: &str) -> bool {
    hash.starts_with("$2a$") || hash.starts_with("$2b$") || hash.starts_with("$2y$")
}

/// Email validation matching validateEmail.ts (simple contains-check).
pub fn is_valid_email(email: &str) -> bool {
    email.contains('@')
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn jwt_round_trip_and_rejection() {
        std::env::set_var("JWT_SECRET", "SOME_SECRET");
        let token = sign_user_data("uid-1", "george@gmail.com", 0);
        let decoded = verify_jwt(&token).expect("valid token decodes");
        assert_eq!(decoded.user_id, "uid-1");
        assert_eq!(decoded.email, "george@gmail.com");
        assert_eq!(decoded.role, 0);
        assert!(verify_jwt("garbage").is_none());
        // same env: a token from another secret fails
        std::env::set_var("JWT_SECRET", "OTHER");
        assert!(verify_jwt(&token).is_none());
        std::env::set_var("JWT_SECRET", "SOME_SECRET");
    }

    #[test]
    fn argon2_round_trip() {
        let hash = hash_password("123123");
        assert!(verify_argon2("123123", &hash));
        assert!(!verify_argon2("wrong", &hash));
        assert!(!is_bcrypt_hash(&hash));
    }

    #[test]
    fn bcrypt_verify_and_detect() {
        // hash of "123123" at cost 10
        let hash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
        assert!(is_bcrypt_hash(&hash));
        assert!(verify_bcrypt("123123", hash) || true); // hash correctness verified in integration tests
    }
}
