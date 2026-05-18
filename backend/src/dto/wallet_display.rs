//! Presentación acotada de wallets en listados (sin exponer la clave completa en UI).

/// Primeros y últimos caracteres de la wallet, separados por «…».
#[must_use]
pub fn mask_wallet(wallet: &str) -> String {
    let t = wallet.trim();
    if t.len() <= 10 {
        return t.to_string();
    }
    format!("{}…{}", &t[..4], &t[t.len() - 4..])
}

#[cfg(test)]
mod tests {
    use super::mask_wallet;

    #[test]
    fn masks_long_base58_wallet() {
        let w = "38UvLTagqQvnjHDYPeHt5x3hh1QMKQ3WcLMbqqa35VG9";
        assert_eq!(mask_wallet(w), "38Uv…5VG9");
    }

    #[test]
    fn short_wallet_unchanged() {
        assert_eq!(mask_wallet("short"), "short");
    }
}
