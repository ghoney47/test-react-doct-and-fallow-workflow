use chrono::{DateTime, NaiveDate, Utc}; // datetime normalization
use serde::{Deserialize, Serialize}; // schema validation library
use validator::Validate;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq)]
pub enum DepartmentSchema {
    ED,
    #[serde(rename = "general")]
    General,
}

// Serialize: Allows for translation of struct into JSON
// Deserialize: Allows for a JSON -> struct translation
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientSchema {
    pub id: u32,
    pub name: String,
    pub dob: NaiveDate,
    pub chief_complaint: String,
    pub department: DepartmentSchema,
    pub arrival_time: DateTime<Utc>,
    pub departure_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CreatePatientSchema {
    #[validate(length(min = 1))]
    pub name: String,
    pub dob: NaiveDate,
    #[validate(length(min = 1))]
    pub chief_complaint: String,
    pub department: DepartmentSchema,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")] // keeps the naming consistent with the typescript when handed off
pub struct UpdatePatientSchema {
    #[validate(length(min = 1))]
    pub name: Option<String>,
    pub dob: Option<NaiveDate>,
    #[validate(length(min = 1))]
    pub chief_complaint: Option<String>,
    pub arrival_time: Option<DateTime<Utc>>,
    pub departure_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MovePatientSchema {
    pub department: DepartmentSchema,
}
