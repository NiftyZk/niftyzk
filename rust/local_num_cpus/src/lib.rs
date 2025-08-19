#[cfg(target_arch = "wasm32")]
pub fn get() -> usize {
    1
}

#[cfg(target_arch = "wasm32")]
pub fn get_physical() -> usize {
    1
}

#[cfg(not(target_arch = "wasm32"))]
pub use num_cpus_original::*;
