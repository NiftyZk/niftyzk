use wasm_bindgen::prelude::*;

//TO ACCESS THE File System from NODEJS
#[wasm_bindgen(module = "fs")]
extern "C" {
    #[wasm_bindgen(js_name = readFileSync)]
    pub fn read_file_sync(path: &str) -> Vec<u8>;

    #[wasm_bindgen(js_name = writeFileSync)]
    pub fn write_file_sync(path: &str, data: &[u8]);
}
