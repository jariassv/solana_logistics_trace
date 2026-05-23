//! Checkpoint-driven shipment status transitions (PLAN §4 — subset MVP).

const TERMINAL: &[&str] = &["Delivered", "Cancelled", "Returned"];

fn is_terminal(status: &str) -> bool {
    TERMINAL.contains(&status)
}

#[must_use]
pub fn next_status_after_checkpoint(current_status: &str, checkpoint_type: &str) -> Option<&'static str> {
    if is_terminal(current_status) {
        return None;
    }

    match checkpoint_type {
        "Delivered" => Some("Delivered"),
        "DeliveryAttempt" if current_status != "OutForDelivery" => Some("OutForDelivery"),
        _ => match (current_status, checkpoint_type) {
            ("Created", "Pickup") => Some("InTransit"),
            ("InTransit", "HubIn") => Some("AtHub"),
            ("AtHub", "HubOut") => Some("InTransit"),
            ("InTransit", "Transit") => Some("OutForDelivery"),
            ("OutForDelivery", "Delivered") => Some("Delivered"),
            _ => None,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pickup_moves_created_to_in_transit() {
        assert_eq!(
            next_status_after_checkpoint("Created", "Pickup"),
            Some("InTransit")
        );
    }

    #[test]
    fn delivered_from_in_transit() {
        assert_eq!(
            next_status_after_checkpoint("InTransit", "Delivered"),
            Some("Delivered")
        );
    }

    #[test]
    fn delivered_from_at_hub() {
        assert_eq!(
            next_status_after_checkpoint("AtHub", "Delivered"),
            Some("Delivered")
        );
    }

    #[test]
    fn delivery_attempt_sets_out_for_delivery() {
        assert_eq!(
            next_status_after_checkpoint("InTransit", "DeliveryAttempt"),
            Some("OutForDelivery")
        );
    }

    #[test]
    fn no_change_when_already_delivered() {
        assert_eq!(next_status_after_checkpoint("Delivered", "Delivered"), None);
    }
}
