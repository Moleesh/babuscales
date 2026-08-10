//! Babulens' own tool, run by hand, never bundled with the app (task #37 —
//! see `tools/license-format`'s module doc for the full design). Four
//! subcommands:
//!
//! ```text
//! licensegen keygen [--out vendor.key]
//! licensegen request-code <machine-hash-hex>
//! licensegen sign --request <REQUEST-CODE> --days <N|perpetual> [--key vendor.key]
//! licensegen verify --code <ACTIVATION-CODE> [--request <REQUEST-CODE>]
//! ```
//!
//! `keygen` is the one subcommand run exactly once in this project's real
//! life — everything issued afterwards reuses the same `vendor.key`. That
//! file must never be committed (same rule as `net::tunnel`'s connector
//! token): keep it wherever Babulens keeps secrets that aren't source code.
//!
//! No `clap` here — four subcommands and a handful of flags don't earn a
//! dependency, and this tool never ships, so its polish budget is "clear
//! error messages", not "nice --help formatting".

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::ExitCode;

use chrono::NaiveDate;
use ed25519_dalek::{SigningKey, SECRET_KEY_LENGTH};
use rand::rngs::OsRng;

fn main() -> ExitCode {
    let args: Vec<String> = env::args().skip(1).collect();
    let result = match args.first().map(String::as_str) {
        Some("keygen") => keygen(&args[1..]),
        Some("request-code") => request_code(&args[1..]),
        Some("sign") => sign(&args[1..]),
        Some("verify") => verify(&args[1..]),
        _ => Err(
            "usage: licensegen <keygen|request-code|sign|verify> ... (see this file's own doc comment)"
                .to_string(),
        ),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("licensegen: {message}");
            ExitCode::FAILURE
        }
    }
}

fn flag_value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|a| a == name)
        .and_then(|i| args.get(i + 1))
        .cloned()
}

fn key_path(args: &[String]) -> PathBuf {
    flag_value(args, "--key")
        .or_else(|| flag_value(args, "--out"))
        .unwrap_or_else(|| "vendor.key".to_string())
        .into()
}

fn keygen(args: &[String]) -> Result<(), String> {
    let path = key_path(args);
    if path.exists() {
        return Err(format!(
            "{} already exists — move it aside first if you really mean to replace it \
             (every code signed with the old key stops verifying the moment you do)",
            path.display()
        ));
    }
    let signing_key = SigningKey::generate(&mut OsRng);
    fs::write(&path, signing_key.to_bytes())
        .map_err(|e| format!("could not write {}: {e}", path.display()))?;

    let public = signing_key.verifying_key().to_bytes();
    println!("wrote private key to {}", path.display());
    println!("keep it out of the repository — this is the one secret that matters");
    println!();
    println!("paste this into tools/license-format/src/lib.rs's VENDOR_PUBLIC_KEY:");
    print!("pub const VENDOR_PUBLIC_KEY: [u8; 32] = [");
    for (i, byte) in public.iter().enumerate() {
        if i % 8 == 0 {
            print!("\n    ");
        }
        print!("0x{byte:02x}, ");
    }
    println!("\n];");
    Ok(())
}

fn parse_machine_hash(raw: &str) -> Result<u64, String> {
    let cleaned = raw.trim().trim_start_matches("0x");
    u64::from_str_radix(cleaned, 16)
        .map_err(|_| format!("'{raw}' isn't a hex machine hash (as printed by the app's Settings → System \"Request code\", or by license_request_code)"))
}

fn request_code(args: &[String]) -> Result<(), String> {
    let hash = args
        .first()
        .ok_or("usage: licensegen request-code <machine-hash-hex>")?;
    let hash = parse_machine_hash(hash)?;
    println!("{}", license_format::encode_request_code(hash));
    Ok(())
}

fn sign(args: &[String]) -> Result<(), String> {
    let request = flag_value(args, "--request").ok_or("--request <REQUEST-CODE> is required")?;
    let days_arg = flag_value(args, "--days").ok_or(
        "--days <N|perpetual> is required — how many days from today this code stays valid",
    )?;
    let path = key_path(args);

    let machine_hash = license_format::decode_request_code(&request)
        .map_err(|e| format!("bad request code: {e}"))?;

    let key_bytes =
        fs::read(&path).map_err(|e| format!("could not read {}: {e}", path.display()))?;
    let key_bytes: [u8; SECRET_KEY_LENGTH] = key_bytes
        .try_into()
        .map_err(|_| format!("{} isn't a valid signing key file", path.display()))?;
    let signing_key = SigningKey::from_bytes(&key_bytes);

    let issued_on = chrono::Utc::now().date_naive();
    let expires_on = if days_arg.eq_ignore_ascii_case("perpetual") {
        None
    } else {
        let days: i64 = days_arg
            .parse()
            .map_err(|_| format!("'{days_arg}' isn't a number of days or 'perpetual'"))?;
        Some(issued_on + chrono::Duration::days(days))
    };

    let code =
        license_format::sign_activation_code(&signing_key, machine_hash, issued_on, expires_on)
            .map_err(|e| format!("could not sign: {e}"))?;
    println!("{code}");
    Ok(())
}

fn verify(args: &[String]) -> Result<(), String> {
    let code = flag_value(args, "--code").ok_or("--code <ACTIVATION-CODE> is required")?;
    let payload =
        license_format::verify_activation_code(&code).map_err(|e| format!("INVALID — {e}"))?;

    println!("VALID");
    println!("  machine hash: {:016x}", payload.machine_hash);
    println!("  issued on:    {}", fmt_date(payload.issued_on));
    println!(
        "  expires on:   {}",
        payload
            .expires_on
            .map(fmt_date)
            .unwrap_or_else(|| "never (perpetual)".to_string())
    );

    if let Some(request) = flag_value(args, "--request") {
        let expected = license_format::decode_request_code(&request)
            .map_err(|e| format!("--request given but couldn't be decoded: {e}"))?;
        if expected == payload.machine_hash {
            println!("  machine check: matches the given request code");
        } else {
            return Err(format!(
                "machine check: this code was issued for {:016x}, not {:016x} — wrong machine",
                payload.machine_hash, expected
            ));
        }
    }
    Ok(())
}

fn fmt_date(date: NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}
