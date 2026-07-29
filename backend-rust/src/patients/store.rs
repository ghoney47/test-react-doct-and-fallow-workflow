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
    /// Returns all patients in storage, or (if specified) in a department
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

    /// Returns a patient with the specified ID, or None if does
    /// not exist
    pub fn get_by_id(&self, id: u32) -> Option<Patient> {
        let inner = self.0.lock().unwrap();

        // Finds the id of the patient within the internal storage
        inner.patients.iter().find(|p| p.id == id).cloned()
    }

    /// Creates a new patient and adds to internal storage
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

    /// Updates a given patient (specified by ID)
    pub fn update(&self, id: u32, changes: PatientUpdate) -> Option<Patient> {
        let mut inner = self.0.lock().unwrap();
        let mut patient = inner.patients.iter_mut().find(|p| p.id == id)?;

        if let Some(name) = changes.name {
            patient.name = name
        };

        if let Some(dob) = changes.dob {
            patient.dob = dob
        };

        if let Some(cc) = changes.chief_complaint {
            patient.chief_complaint = cc
        };

        if let Some(ar_time) = changes.arrival_time {
            patient.arrival_time = ar_time
        };

        if let Some(dep_time) = changes.departure_time {
            patient.departure_time = dep_time
        };

        Some(patient.clone())
    }

    ///Removes patient by ID
    pub fn remove(&self, id: u32) -> bool {
        let mut inner = self.0.lock().unwrap();
        match inner.patients.iter_mut().position(|p| p.id == id) {
            Some(index) => {
                inner.patients.remove(index);
                return true;
            }
            None => return false,
        };
    }
}
