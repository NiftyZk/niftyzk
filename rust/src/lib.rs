#![allow(clippy::unit_arg)]

#[macro_use]
extern crate serde;
#[macro_use]
extern crate hex_literal;
extern crate bellman_vk_codegen;
extern crate byteorder;
extern crate franklin_crypto;
extern crate itertools;
extern crate num_bigint;
extern crate num_traits;
extern crate rand;
extern crate anyhow;
extern crate wasm_bindgen;
extern crate console_error_panic_hook;

pub mod circom_circuit;
pub mod plonk;
pub mod r1cs_file;
pub mod reader;

pub mod transpile;
pub mod utils;
pub mod bindings;

pub use franklin_crypto::bellman as bellman_ce;

use wasm_bindgen::prelude::*;
use serde::Serialize;
use circom_circuit::CircomCircuit;
use bindings::{ read_file_sync, write_file_sync };
use std::path::Path;
use bellman_ce::pairing::{ bn256::Bn256, ff::PrimeField, Engine };

#[wasm_bindgen]
pub fn export_verification_key(setupfile: &str, r1cs_file: &str, vk_out: &str) -> bool {
    console_log::init_with_level(log::Level::Debug).expect("console_log init failed");
    console_error_panic_hook::set_once();
    let circuit = CircomCircuit {
        r1cs: reader::load_r1cs(&r1cs_file),
        witness: None,
        wire_mapping: None,
        aux_offset: plonk::AUX_OFFSET,
    };

    let srs_data = reader::load_key_monomial_form(&setupfile);

    let setup = plonk::SetupForProver
        ::prepare_setup_for_prover(circuit, srs_data, None)
        .expect("prepare err");

    let vk = setup.make_verification_key().unwrap();

    let mut vk_buf = Vec::new();
    vk.write(&mut vk_buf).unwrap();
    write_file_sync(&vk_out, &vk_buf);

    log::info!("Verification key saved to {}", vk_out);
    return true;
}

#[wasm_bindgen]
pub fn serialize_verification_key(vk_path: &str) -> String {
    let vkey = read_file_sync(vk_path);
    //Parses it and then serializes it so it can be concated into a cosmwasm contract
    //TODO: then the deserializer will work inside the cosmwasm contract!
    "".to_string()
}

#[derive(Serialize)]
pub struct ProveRes {
    pub proof: String,
    pub public_inputs: String,
}

#[wasm_bindgen]
pub fn prove(
    setupfile: &str,
    r1cs_file: &str,
    witness_file: &str,
    proof_bin_file: &str,
    proof_json_file: &str,
    public_inputs_json: &str
) -> JsValue {
    console_log::init_with_level(log::Level::Debug).expect("console_log init failed");
    console_error_panic_hook::set_once();

    let circuit = CircomCircuit {
        r1cs: reader::load_r1cs(&r1cs_file),
        witness: Some(reader::load_witness_from_file::<Bn256>(&witness_file)),
        wire_mapping: None,
        aux_offset: plonk::AUX_OFFSET,
    };

    let setup = plonk::SetupForProver
        ::prepare_setup_for_prover(
            circuit.clone(),
            reader::load_key_monomial_form(&setupfile),
            None
        )
        .expect("prepare err");

    log::info!("Proving...");

    let proof = setup.prove(circuit, "keccak").unwrap();

    let mut proof_buf = Vec::new();
    proof.write(&mut proof_buf).unwrap();
    write_file_sync(&proof_bin_file, &proof_buf);

    let (inputs, serialized_proof) = bellman_vk_codegen::serialize_proof(&proof);
    let ser_proof_str = serde_json::to_string_pretty(&serialized_proof).unwrap();
    let ser_inputs_str = serde_json::to_string_pretty(&inputs).unwrap();

    let result = ProveRes {
        proof: ser_proof_str,
        public_inputs: ser_inputs_str,
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

//TODO: Run verify and make it output the serialized vkey and a serialzied proof
//TODO: that will be used afterwards to insert into the cosmwasm contract code!
// #[wasm_bindgen]
// pub fn verify(vk_path: &str) {}
