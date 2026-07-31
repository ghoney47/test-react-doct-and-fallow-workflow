mod patients;
#[cfg(test)]
mod tests;

use axum::{Router, routing::get};
use patients::{handlers, store::Store};

// Split out of main so tests can build the identical router and drive it
// directly, with no port to bind and no server to race against.
fn app(store: Store) -> Router {
    Router::new()
        .route("/", get(|| async { "This is Test!" }))
        // prefixes every route the child registered: "/" -> /patients, "/{id}" -> /patients/{id}
        .nest("/patients", handlers::routes())
        // supplies the Store the handlers demand: Router<Store> -> Router<()>
        // the router holds no Store before this line, one Arc handle after. serve() only takes Router<()>
        .with_state(store)
}

// attribute macro: rewrites this into a sync main that starts a tokio runtime and blocks on it.
// `async fn main` is illegal on its own because at program entry there is no runtime to drive it yet.
#[tokio::main]
async fn main() {
    let app = app(Store::new());

    // unwrap_or_else takes a closure, so the fallback String is only built when PORT is missing.
    // `|_|` discards the VarError, same shape as the map_err in handlers.rs
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    // read the port back off the listener rather than printing `port` — it is what actually bound
    println!(
        "Server is running on http://localhost:{}",
        listener.local_addr().unwrap().port()
    );

    axum::serve(listener, app).await.unwrap();
}
