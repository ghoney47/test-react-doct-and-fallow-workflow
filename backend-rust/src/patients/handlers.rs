use crate::patients::{
    schema::{Department, NewPatient, Patient, PatientMove, PatientUpdate},
    store::Store,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, patch},
}; // web framework core
use serde::Deserialize; // schema validation libray
use validator::Validate;

#[derive(Deserialize)]
pub struct DepartmentQuery {
    // allows for the enitre query string to be deserialized into one struct
    department: Option<Department>, // allows for the department input to be optional
}

// returns a `Router<Store> as it expects a store to be supplied
// ^ must be called with a .with_state() because we cannot forget the state at runtime
// builds a method router -> a small table for some path
pub fn routes() -> Router<Store> {
    Router::new()
        .route("/", get(get_all).post(create)) // Communiates that with the `/` route we should expect only a get or a post call
        .route("/{id}", get(get_by_id).patch(update).delete(remove)) // should only get a get, patch, or delete call
        .route("/{id}/move", patch(move_patient)) // should only get a patch call
}

// all handlers with axum must be async
// we cannot have await within an async with a mutex guard because it fails to compile on send
// we get around this by pushing the lock into the get_all method in the store
async fn get_all(
    State(store): State<Store>,
    Query(q): Query<DepartmentQuery>,
) -> Json<Vec<Patient>> {
    Json(store.get_all(q.department)) // instead of a context object, we get the Json() or Path() or Query() parameter, more explict than the context object in Hono
}

async fn create(
    State(store): State<Store>,
    Json(input): Json<NewPatient>, // will catch malformed JSON, validate will catch parameter specific issues
) -> Result<(StatusCode, Json<Patient>), StatusCode> {
    // says that if we get any output from the validator (thus bad input) we will simply mark as bad request
    input.validate().map_err(|_| StatusCode::BAD_REQUEST)?; // `?` will cause an early return given we have some error, this will return Err(e)
    Ok((StatusCode::CREATED, Json(store.create(input)))) // if no error `?` will cause the above line to fall through and hit this line
}

async fn get_by_id(
    State(store): State<Store>,
    Path(id): Path<u32>,
) -> Result<Json<Patient>, StatusCode> {
    // get_by_id will give a Option<Patient>, so .map is going to either do nothing, or apply the function to the object
    // the Json is short for (|p| Json(p)) so we are building a Json wrapper -> Json(pateint)
    // No actual JSON text is created here, just marked for serialization, map is just doing type annotation
    // ok_or() is taking the .map(Json) -> Option<Json<Patient?>> and
    // translating it to Result<Json<Patient>, StatusCode>
    // as it changes the container: Some(x) -> Ok(x)
    store.get_by_id(id).map(Json).ok_or(StatusCode::NOT_FOUND)
}

async fn update(
    State(store): State<Store>,
    Path(id): Path<u32>,

    // this Json call must always be last because it is the only thing reading the request body
    // and that stream can only be consumed once
    // would cause a compile error if in different place
    Json(changes): Json<PatientUpdate>,
) -> Result<Json<Patient>, StatusCode> {
    // here validate only borrows the changes, so we still have access to the original
    changes.validate().map_err(|_| StatusCode::BAD_REQUEST)?;

    // store is what consumes changes, so after this call we would be unable
    // to use changes if we theoretically call it after this block
    store
        .update(id, changes)
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

// If we were to pass in a {} object for update because each PatientUpdate field is optional,
// we would get a success with no changes (same as in TS)

async fn move_patient(
    State(store): State<Store>,
    Path(id): Path<u32>,
    Json(changes): Json<PatientMove>,
) -> Result<Json<Patient>, StatusCode> {
    store
        // no need for validation because we require the input to be of the department enum
        .move_patient(id, changes.department)
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn remove(State(store): State<Store>, Path(id): Path<u32>) -> StatusCode {
    if store.remove(id) {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}
