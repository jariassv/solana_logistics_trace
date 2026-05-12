//! Resolve map coordinates: DB columns override `metadata_json` (PLAN §11 / §19.5).

use serde_json::Value;

#[must_use]
pub fn resolve_checkpoint_coordinates(
    latitude: Option<f64>,
    longitude: Option<f64>,
    metadata_json: &Value,
) -> (Option<f64>, Option<f64>) {
    if latitude.is_some() || longitude.is_some() {
        return (latitude, longitude);
    }
    let lat = metadata_json
        .get("lat")
        .or_else(|| metadata_json.get("latitude"))
        .and_then(Value::as_f64);
    let lng = metadata_json
        .get("lng")
        .or_else(|| metadata_json.get("longitude"))
        .and_then(Value::as_f64);
    (lat, lng)
}

#[cfg(test)]
mod tests {
    use super::resolve_checkpoint_coordinates;
    use serde_json::json;

    #[test]
    fn columns_override_metadata_coordinates() {
        let meta = json!({"lat": 10.0, "lng": 20.0});
        let (la, lo) = resolve_checkpoint_coordinates(Some(1.0), Some(2.0), &meta);
        assert_eq!(la, Some(1.0));
        assert_eq!(lo, Some(2.0));
    }

    #[test]
    fn metadata_used_when_columns_absent() {
        let meta = json!({"lat": 3.5, "lng": -4.2});
        let (la, lo) = resolve_checkpoint_coordinates(None, None, &meta);
        assert_eq!(la, Some(3.5));
        assert_eq!(lo, Some(-4.2));
    }

    #[test]
    fn accepts_latitude_longitude_aliases_in_metadata() {
        let meta = json!({"latitude": 9.0, "longitude": 8.0});
        let (la, lo) = resolve_checkpoint_coordinates(None, None, &meta);
        assert_eq!(la, Some(9.0));
        assert_eq!(lo, Some(8.0));
    }
}
