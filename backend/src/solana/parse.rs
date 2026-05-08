//! Helpers over `getTransaction` JSON (`encoding: json`). PLAN §9.

use serde_json::Value;

use crate::solana::SolanaSyncError;

/// Normalizes JSON-RPC `getTransaction` payload: our HTTP client returns the **result** object
/// only (`{ transaction, meta, slot, ... }`). Tests may pass full `{ "result": ... }`.
#[must_use]
pub fn transaction_result(tx: &Value) -> Option<&Value> {
    if tx.get("transaction").is_some() {
        return Some(tx);
    }
    let r = tx.get("result")?;
    if r.is_null() {
        return None;
    }
    Some(r)
}

#[must_use]
pub fn message_account_keys(tx: &Value) -> Result<Vec<String>, SolanaSyncError> {
    let res = transaction_result(tx).ok_or(SolanaSyncError::TxNotFound)?;
    let keys = res
        .pointer("/transaction/message/accountKeys")
        .and_then(|v| v.as_array())
        .ok_or(SolanaSyncError::MalformedTransaction)?;
    keys.iter()
        .map(|k| {
            k.as_str()
                .map(std::string::ToString::to_string)
                .or_else(|| k.get("pubkey").and_then(|p| p.as_str().map(|s| s.to_string())))
                .ok_or(SolanaSyncError::MalformedTransaction)
        })
        .collect()
}

fn ix_accounts_indices(ix: &Value) -> Result<Vec<usize>, SolanaSyncError> {
    let raw = ix.get("accounts").ok_or(SolanaSyncError::MalformedTransaction)?;
    // Legacy: array of numbers; versioned: base58 string of concatenated u8 indices.
    if let Some(arr) = raw.as_array() {
        return arr
            .iter()
            .map(|v| {
                v.as_u64()
                    .map(|u| u as usize)
                    .ok_or(SolanaSyncError::MalformedTransaction)
            })
            .collect();
    }
    if let Some(s) = raw.as_str() {
        let bytes = bs58::decode(s).into_vec().map_err(|_| SolanaSyncError::MalformedTransaction)?;
        return Ok(bytes.iter().map(|&b| b as usize).collect());
    }
    Err(SolanaSyncError::MalformedTransaction)
}

#[must_use]
pub fn outer_instructions(tx: &Value) -> Result<Vec<Value>, SolanaSyncError> {
    let res = transaction_result(tx).ok_or(SolanaSyncError::TxNotFound)?;
    let arr = res
        .pointer("/transaction/message/instructions")
        .and_then(|v| v.as_array())
        .ok_or(SolanaSyncError::MalformedTransaction)?;
    Ok(arr.clone())
}

#[must_use]
pub fn ix_data_bytes(ix: &Value) -> Result<Vec<u8>, SolanaSyncError> {
    let data = ix.get("data").ok_or(SolanaSyncError::MalformedTransaction)?;
    let s = data.as_str().ok_or(SolanaSyncError::MalformedTransaction)?;
    bs58::decode(s).into_vec().map_err(|_| SolanaSyncError::MalformedTransaction)
}

#[must_use]
pub fn ix_program_index(ix: &Value) -> Result<usize, SolanaSyncError> {
    let idx = ix
        .get("programIdIndex")
        .and_then(serde_json::Value::as_u64)
        .ok_or(SolanaSyncError::MalformedTransaction)?;
    Ok(idx as usize)
}

#[must_use]
pub fn resolve_ix_accounts(keys: &[String], ix: &Value) -> Result<Vec<String>, SolanaSyncError> {
    let indices = ix_accounts_indices(ix)?;
    indices
        .into_iter()
        .map(|i| {
            keys.get(i)
                .cloned()
                .ok_or(SolanaSyncError::MalformedTransaction)
        })
        .collect()
}

#[must_use]
pub fn program_in_transaction(keys: &[String], program_id: &str) -> bool {
    keys.iter().any(|k| k == program_id)
}

#[must_use]
pub fn transaction_slot(tx: &Value) -> Option<i64> {
    let res = transaction_result(tx)?;
    res.get("slot")
        .or_else(|| res.pointer("/meta/slot"))
        .and_then(|v| v.as_u64())
        .map(|s| s as i64)
}

/// First outer instruction targeting `program_id` whose data starts with `discriminator`.
#[must_use]
pub fn find_program_instruction(
    tx: &Value,
    program_id: &str,
    discriminator: &[u8; 8],
) -> Result<(Vec<String>, Vec<u8>), SolanaSyncError> {
    let keys = message_account_keys(tx)?;
    if !program_in_transaction(&keys, program_id) {
        return Err(SolanaSyncError::WrongProgram);
    }
    for ix in outer_instructions(tx)? {
        let pidx = ix_program_index(&ix)?;
        let prog = keys
            .get(pidx)
            .ok_or(SolanaSyncError::MalformedTransaction)?;
        if prog != program_id {
            continue;
        }
        let data = ix_data_bytes(&ix)?;
        if data.len() >= 8 && data[..8] == *discriminator {
            let accounts = resolve_ix_accounts(&keys, &ix)?;
            return Ok((accounts, data));
        }
    }
    Err(SolanaSyncError::WrongInstruction)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    use crate::solana::discriminators::register_actor_ix;

    #[test]
    fn transaction_result_accepts_unwrapped_get_transaction_body() {
        let body = json!({
            "slot": 42u64,
            "transaction": { "message": { "accountKeys": ["prog"], "instructions": [] } },
            "meta": {}
        });
        assert!(transaction_result(&body).is_some());
        assert_eq!(transaction_slot(&body), Some(42));
    }

    #[test]
    fn transaction_result_accepts_full_json_rpc_envelope() {
        let body = json!({
            "result": {
                "slot": 7u64,
                "transaction": { "message": { "accountKeys": ["A"], "instructions": [] } },
                "meta": {}
            }
        });
        assert_eq!(transaction_slot(&body), Some(7));
    }

    #[test]
    fn find_program_instruction_detects_discriminator() {
        let prog = "Prog111111111111111111111111111111111111111";
        let disc = register_actor_ix();
        let mut payload = disc.to_vec();
        payload.extend_from_slice(&[1u8, 2, 3]);
        let ix_data = bs58::encode(payload).into_string();
        let tx = json!({
            "transaction": {
                "message": {
                    "accountKeys": [prog, "Other111111111111111111111111111111111111111"],
                    "instructions": [{
                        "programIdIndex": 0u64,
                        "accounts": [0u64, 1u64],
                        "data": ix_data
                    }]
                }
            },
            "meta": {}
        });
        let (keys, data) = find_program_instruction(&tx, prog, &disc).expect("match");
        assert_eq!(keys, vec![prog.to_string(), "Other111111111111111111111111111111111111111".to_string()]);
        assert_eq!(&data[..8], disc.as_slice());
    }

    #[test]
    fn parse_json_fixture_register_actor_instruction() {
        const FIXTURE: &str =
            include_str!("../../tests/fixtures/register_actor_tx.json");
        let tx: Value = serde_json::from_str(FIXTURE).expect("fixture JSON");
        let prog = "Prog111111111111111111111111111111111111111";
        let disc = register_actor_ix();
        find_program_instruction(&tx, prog, &disc).expect("fixture should parse");
    }

    #[test]
    fn find_program_instruction_errors_when_discriminator_mismatch() {
        let prog = "Prog111111111111111111111111111111111111111";
        let want = register_actor_ix();
        let wrong = [9u8; 8];
        let mut payload = wrong.to_vec();
        payload.push(1);
        let ix_data = bs58::encode(payload).into_string();
        let tx = json!({
            "transaction": {
                "message": {
                    "accountKeys": [prog],
                    "instructions": [{
                        "programIdIndex": 0u64,
                        "accounts": [0u64],
                        "data": ix_data
                    }]
                }
            },
            "meta": {}
        });
        let err = find_program_instruction(&tx, prog, &want).unwrap_err();
        assert!(matches!(err, SolanaSyncError::WrongInstruction));
    }
}
