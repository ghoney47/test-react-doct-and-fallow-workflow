//! Contract tests for the patients API.
//!
//! These exist to protect one specific thing: the frontend talks to this
//! backend over HTTP with no shared type system between them. `frontend/src/types.ts`
//! restates the wire format by hand, so nothing at compile time notices when a
//! `#[serde(rename_all = "camelCase")]` or an enum rename drifts apart from it.
//! Every assertion below mirrors a line in that file or a call in
//! `frontend/src/api/patients.ts` — if a test here fails, the frontend breaks.
//!
//! The router is driven directly through `tower::oneshot` rather than over a
//! real socket: no port to bind, no server to race, tests run in parallel.

use crate::{app, patients::store::Store};
use axum::{
    Router,
    body::Body,
    http::{Request, StatusCode, header},
};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tower::ServiceExt;

/// A patient body that satisfies every validator on `NewPatient`.
fn new_patient() -> Value {
    json!({
        "name": "Ada Lovelace",
        "dob": "1990-05-02",
        "chiefComplaint": "chest pain",
        "department": "ED",
    })
}

/// Issues one request against the router.
///
/// The `Content-Type: application/json` header is set unconditionally because
/// that is what the frontend does — `request()` in `api/patients.ts` spreads it
/// into every call, including GET and DELETE. Testing without it would test a
/// request the frontend never actually sends.
async fn send(app: Router, method: &str, uri: &str, body: Option<Value>) -> (StatusCode, Value) {
    let req = Request::builder()
        .method(method)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json");

    let req = match body {
        Some(b) => req.body(Body::from(b.to_string())).unwrap(),
        None => req.body(Body::empty()).unwrap(),
    };

    let res = app.oneshot(req).await.unwrap();
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();

    // 204 replies have no body, and serde_json rejects an empty slice.
    let value = if bytes.is_empty() {
        Value::Null
    } else {
        // Axum's own rejections (malformed JSON, an unknown Department variant)
        // answer in plain text rather than JSON, so keep the text as-is instead
        // of panicking — the status is what those tests assert on anyway.
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| Value::String(String::from_utf8_lossy(&bytes).into_owned()))
    };

    (status, value)
}

/// A router plus a handle to the store behind it. Cloning a `Router` shares the
/// same `Arc` store, so `app.clone()` per request keeps state across a test.
fn test_app() -> Router {
    app(Store::new())
}

// --- the wire format -------------------------------------------------------

/// The whole point of the suite. `frontend/src/types.ts` declares exactly these
/// seven keys in camelCase; a serde rename that drops or renames one would
/// otherwise surface as `undefined` in the UI with nothing failing loudly.
#[tokio::test]
async fn created_patient_matches_the_frontend_patient_type() {
    let (status, body) = send(test_app(), "POST", "/patients", Some(new_patient())).await;

    assert_eq!(status, StatusCode::CREATED);

    let obj = body.as_object().unwrap();
    let mut keys: Vec<&str> = obj.keys().map(String::as_str).collect();
    keys.sort();
    assert_eq!(
        keys,
        [
            "arrivalTime",
            "chiefComplaint",
            "department",
            "departureTime",
            "dob",
            "id",
            "name",
        ]
    );
}

/// `Department` in types.ts is the union `"general" | "ED"` — those two exact
/// strings. The Rust enum spells its variants `General` and `ED`, so both rely
/// on a serde rename holding.
#[tokio::test]
async fn department_serializes_as_the_frontend_union_strings() {
    let app = test_app();

    let (_, ed) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    assert_eq!(ed["department"], "ED");

    let mut general = new_patient();
    general["department"] = json!("general");
    let (_, general_res) = send(app.clone(), "POST", "/patients", Some(general)).await;
    assert_eq!(general_res["department"], "general");
}

/// `departureTime` is `string | null` on the frontend — it must serialize as an
/// explicit null, not be omitted, or the field vanishes from the object.
#[tokio::test]
async fn departure_time_is_null_not_absent_on_arrival() {
    let (_, body) = send(test_app(), "POST", "/patients", Some(new_patient())).await;
    assert!(body.as_object().unwrap().contains_key("departureTime"));
    assert!(body["departureTime"].is_null());
}

// --- routing ---------------------------------------------------------------

/// `BASE` in api/patients.ts is `"/patients"`, and `getPatients()` requests
/// `BASE + ""` — so the collection is hit with no trailing slash. Axum's `nest`
/// with a child `"/"` route is exactly where that can silently 404.
#[tokio::test]
async fn collection_routes_without_a_trailing_slash() {
    let app = test_app();

    let (status, body) = send(app.clone(), "GET", "/patients", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body, json!([]));

    let (status, _) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    assert_eq!(status, StatusCode::CREATED);
}

// --- getPatients -----------------------------------------------------------

/// `getPatients(department)` sends `?department=ED`. This deserializes a Rust
/// enum out of a query string, which is a narrower path than JSON decoding and
/// worth pinning separately.
#[tokio::test]
async fn get_all_filters_by_department_query() {
    let app = test_app();

    send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    let mut general = new_patient();
    general["name"] = json!("Grace Hopper");
    general["department"] = json!("general");
    send(app.clone(), "POST", "/patients", Some(general)).await;

    let (status, all) = send(app.clone(), "GET", "/patients", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(all.as_array().unwrap().len(), 2);

    let (_, ed) = send(app.clone(), "GET", "/patients?department=ED", None).await;
    assert_eq!(ed.as_array().unwrap().len(), 1);
    assert_eq!(ed[0]["name"], "Ada Lovelace");

    let (_, general_res) = send(app.clone(), "GET", "/patients?department=general", None).await;
    assert_eq!(general_res.as_array().unwrap().len(), 1);
    assert_eq!(general_res[0]["name"], "Grace Hopper");
}

// --- getPatient ------------------------------------------------------------

#[tokio::test]
async fn get_by_id_returns_the_patient_or_404() {
    let app = test_app();
    let (_, created) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    let id = created["id"].as_u64().unwrap();

    let (status, found) = send(app.clone(), "GET", &format!("/patients/{id}"), None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(found["name"], "Ada Lovelace");

    let (status, _) = send(app.clone(), "GET", "/patients/9999", None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// --- createPatient ---------------------------------------------------------

/// The server owns `id`, `arrivalTime` and `departureTime` — that is the reason
/// `NewPatient` in types.ts is an `Omit` of those three. Ids start at 1 and
/// increment, matching the TypeScript backend this was ported from.
#[tokio::test]
async fn create_assigns_server_owned_fields() {
    let app = test_app();

    let (_, first) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    assert_eq!(first["id"], 1);
    assert!(!first["arrivalTime"].as_str().unwrap().is_empty());

    let (_, second) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    assert_eq!(second["id"], 2);
}

/// `name` and `chiefComplaint` carry `#[validate(length(min = 1))]`. The
/// frontend marks those inputs `required`, but that is only a browser-side
/// convenience — the server has to reject them independently.
#[tokio::test]
async fn create_rejects_empty_required_fields() {
    let app = test_app();

    let mut blank_name = new_patient();
    blank_name["name"] = json!("");
    let (status, _) = send(app.clone(), "POST", "/patients", Some(blank_name)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let mut blank_complaint = new_patient();
    blank_complaint["chiefComplaint"] = json!("");
    let (status, _) = send(app.clone(), "POST", "/patients", Some(blank_complaint)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

/// The `Department` union is closed. A value outside it must not create a
/// patient — this is rejected during deserialization, before validation runs,
/// which is why the status differs from the 400 above.
#[tokio::test]
async fn create_rejects_a_department_outside_the_union() {
    let app = test_app();

    let mut bad = new_patient();
    bad["department"] = json!("cardiology");
    let (status, _) = send(app.clone(), "POST", "/patients", Some(bad)).await;
    assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);

    let (_, all) = send(app.clone(), "GET", "/patients", None).await;
    assert_eq!(all.as_array().unwrap().len(), 0);
}

// --- updatePatient ---------------------------------------------------------

/// `PatientUpdate` is a `Partial<...>`, so a request may carry any subset of
/// the fields. Sending one must leave the others untouched.
#[tokio::test]
async fn update_applies_only_the_fields_sent() {
    let app = test_app();
    let (_, created) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    let id = created["id"].as_u64().unwrap();

    let (status, updated) = send(
        app.clone(),
        "PATCH",
        &format!("/patients/{id}"),
        Some(json!({ "chiefComplaint": "chest pain, resolved" })),
    )
    .await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(updated["chiefComplaint"], "chest pain, resolved");
    assert_eq!(updated["name"], "Ada Lovelace");
    assert_eq!(updated["dob"], "1990-05-02");
    assert_eq!(updated["department"], "ED");
}

/// Every field being optional means `{}` is a legal, if pointless, request —
/// it should succeed unchanged rather than error.
#[tokio::test]
async fn update_with_no_changes_succeeds() {
    let app = test_app();
    let (_, created) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    let id = created["id"].as_u64().unwrap();

    let (status, body) = send(
        app.clone(),
        "PATCH",
        &format!("/patients/{id}"),
        Some(json!({})),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["name"], "Ada Lovelace");
}

/// The length validators have to survive being wrapped in `Option` — a present
/// but empty `name` is still invalid.
#[tokio::test]
async fn update_rejects_an_empty_name() {
    let app = test_app();
    let (_, created) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    let id = created["id"].as_u64().unwrap();

    let (status, _) = send(
        app.clone(),
        "PATCH",
        &format!("/patients/{id}"),
        Some(json!({ "name": "" })),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn update_of_a_missing_patient_is_404() {
    let (status, _) = send(
        test_app(),
        "PATCH",
        "/patients/9999",
        Some(json!({ "name": "Nobody" })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// --- movePatient -----------------------------------------------------------

/// Department changes get their own endpoint, which is why `PatientUpdate`
/// omits the field entirely. Moving must also make the patient show up under
/// the new department's filter.
#[tokio::test]
async fn move_changes_department_and_the_filter_follows() {
    let app = test_app();
    let (_, created) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    let id = created["id"].as_u64().unwrap();

    let (status, moved) = send(
        app.clone(),
        "PATCH",
        &format!("/patients/{id}/move"),
        Some(json!({ "department": "general" })),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(moved["department"], "general");

    let (_, ed) = send(app.clone(), "GET", "/patients?department=ED", None).await;
    assert_eq!(ed.as_array().unwrap().len(), 0);

    let (_, general_res) = send(app.clone(), "GET", "/patients?department=general", None).await;
    assert_eq!(general_res.as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn move_of_a_missing_patient_is_404() {
    let (status, _) = send(
        test_app(),
        "PATCH",
        "/patients/9999/move",
        Some(json!({ "department": "general" })),
    )
    .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

// --- deletePatient ---------------------------------------------------------

/// `deletePatient` is typed `Promise<void>` and `request()` short-circuits on
/// status 204 precisely because parsing an empty body throws. A 200 with no
/// body here would break the frontend even though the delete itself worked.
#[tokio::test]
async fn delete_returns_204_with_no_body_and_removes_the_patient() {
    let app = test_app();
    let (_, created) = send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    let id = created["id"].as_u64().unwrap();

    let (status, body) = send(app.clone(), "DELETE", &format!("/patients/{id}"), None).await;
    assert_eq!(status, StatusCode::NO_CONTENT);
    assert_eq!(body, Value::Null);

    let (status, _) = send(app.clone(), "GET", &format!("/patients/{id}"), None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);

    let (_, all) = send(app.clone(), "GET", "/patients", None).await;
    assert_eq!(all, json!([]));
}

#[tokio::test]
async fn delete_of_a_missing_patient_is_404() {
    let (status, _) = send(test_app(), "DELETE", "/patients/9999", None).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

/// Removing one patient must not disturb the others' ids — the frontend uses
/// `id` as its React `key`.
#[tokio::test]
async fn delete_leaves_other_patients_untouched() {
    let app = test_app();
    send(app.clone(), "POST", "/patients", Some(new_patient())).await;
    let mut second = new_patient();
    second["name"] = json!("Grace Hopper");
    let (_, keep) = send(app.clone(), "POST", "/patients", Some(second)).await;

    send(app.clone(), "DELETE", "/patients/1", None).await;

    let (_, all) = send(app.clone(), "GET", "/patients", None).await;
    assert_eq!(all.as_array().unwrap().len(), 1);
    assert_eq!(all[0]["id"], keep["id"]);
    assert_eq!(all[0]["name"], "Grace Hopper");
}
