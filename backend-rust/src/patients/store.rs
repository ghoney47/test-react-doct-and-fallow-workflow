use crate::patients::schema::{Department, NewPatient, Patient, PatientMove, PatientUpdate};
use chrono::Utc;
use std::{
    clone,
    sync::{Arc, Mutex},
};

/// Internal Data Storage
// No built-in thread safety
struct Inner {
    patients: Vec<Patient>,
    next_id: u32,
}

/// Storage of data to share
// `Mutex<Inner>` locks the thread on inner to be able to modify safely
// `Arc<...>` makes the Mutex sharable, so we can clone it and give to multiple
// threads or async tasks and all will point to the same inner
#[derive(Clone)]
pub struct Store(Arc<Mutex<Inner>>);

impl Store {
    pub fn get_all(&self, department: Option<Department>) -> Vec<Patient> {
        // this call is grabbing the `Arc<Mutex<Inner>>` and locking it to access the inner data
        // and unwrap panics if another thread has affected the mutex
        let inner = self.0.lock().unwrap();

        // match against an inputted department so that we can either return the
        // whole internal storage, or just a certain department
        match department {
            Some(dept) => inner
                .patients
                .iter()
                .filter(|i| i.department == dept)
                .cloned()
                .collect(),
            None => inner.patients.clone(),
        }
    }

    pub fn get_by_id(&self, id: u32) -> Option<Patient> {
        let inner = self.0.lock().unwrap();

        // Finds the id of the patient within the internal storage
        inner.patients.iter().find(|p| p.id == id).cloned()
    }

    pub fn create(&self, input: NewPatient) -> Patient {
        let mut inner = self.0.lock().unwrap();
        inner.next_id += 1;

        // building new patient with input
        let patient = Patient {
            id: inner.next_id,
            name: input.name,
            dob: input.dob,
            chief_complaint: input.chief_complaint,
            department: input.department,
            arrival_time: Utc::now(),
            departure_time: None,
        };

        // clones and inserts patient
        inner.patients.push(patient.clone()); // cloned because we are returning the created struct
        patient
    }

    // Continue with update and remove
}
