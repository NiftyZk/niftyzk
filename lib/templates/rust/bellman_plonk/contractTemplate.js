const dirs = [".cargo", "src"];

const files = [
    //.cargo/config.toml
    {
        name: ".cargo/config.toml",
        content: () => `
[alias]
wasm = "build --target wasm32-unknown-unknown --release"
wasm-debug = "build --target wasm32-unknown-unknown"`
    },
    //.gitignore
    {
        name: ".gitignore",
        content: () => `/target`
    },
    // Cargo.toml
    {
        name: "Cargo.toml",
        content: () => `[package]
name = "contract"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
cosmwasm-std = { version = "1.0.0-beta8", features = ["staking"] }

pairing = "0.22.0"
group = "0.12.0"
ff = "0.12.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
pairing_ce = { git = "https://github.com/matter-labs/pairing.git" }
ff_ce = "0.14.3"
bellman_ce = { git = "https://github.com/DoraFactory/bellman.git" }
franklin-crypto = { git = "https://github.com/matter-labs/franklin-crypto", branch = "beta", features = [ "plonk" ] }
hex = "0.4"

[dev-dependencies]
cw-multi-test = "0.13.4"`
    },
    // src/lib.rs
    {
        name: "src/lib.rs",
        content: () => `use cosmwasm_std::{
    entry_point, Binary, Deps, DepsMut, Empty, Env, MessageInfo, Response, StdResult,
};

mod verify;
mod contract;
mod msg;

#[entry_point]
pub fn instantiate(deps: DepsMut, env: Env, info: MessageInfo, msg: Empty)
  -> StdResult<Response>
{
    contract::instantiate(deps, env, info, msg)
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: msg::QueryMsg)
  -> StdResult<Binary>
{
    contract::query(deps, env, msg)
}`
    },
    //msg.rs
    {
        name: "src/msg.rs",
        content: () => `use serde::{ Deserialize, Serialize };

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct GreetResp {
    pub message: String,
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub struct VerifyProofResp {
    pub verified: bool,
}

#[derive(Serialize, Deserialize, PartialEq, Debug, Clone)]
pub enum QueryMsg {
    Greet {},
    VerifyProof {
        proof_bytes: Vec<u8>,
    },
}`},
    {
        name: "src/contract.rs",
        content: ({ enc_proof }) => `use crate::msg::{ GreetResp, QueryMsg, VerifyProofResp };
use crate::verify::{ verify_proof };
use cosmwasm_std::{
    to_json_binary,
    Binary,
    Deps,
    DepsMut,
    Empty,
    Env,
    MessageInfo,
    Response,
    StdResult,
};

pub fn instantiate(
    _deps: DepsMut,
    _env: Env,
    _info: MessageInfo,
    _msg: Empty
) -> StdResult<Response> {
    Ok(Response::new())
}

pub fn query(_deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    use QueryMsg::*;

    match msg {
        Greet {} => to_json_binary(&query::greet()?),
        VerifyProof { proof_bytes } =>
            to_json_binary(
                &(VerifyProofResp {
                    verified: verify_proof(proof_bytes),
                })
            ),
    }
}

mod query {
    use super::*;

    pub fn greet() -> StdResult<GreetResp> {
        let resp = GreetResp {
            message: "Hello World".to_owned(),
        };

        Ok(resp)
    }
}


#[cfg(test)]
mod tests {
    use cosmwasm_std::from_json;
    use cosmwasm_std::testing::{ mock_dependencies, mock_env, mock_info };

    use super::*;

    #[test]
    fn greet_query() {
        let mut deps = mock_dependencies();
        let env = mock_env();

        instantiate(deps.as_mut(), env.clone(), mock_info("sender", &[]), Empty {}).unwrap();

        let resp = query(deps.as_ref(), env, QueryMsg::Greet {}).unwrap();
        let resp: GreetResp = from_json(&resp).unwrap();
        assert_eq!(resp, GreetResp {
            message: "Hello World".to_owned(),
        });
    }

    #[test]
    fn test_verify() {
        let mut deps = mock_dependencies();
        let env = mock_env();
        instantiate(deps.as_mut(), env.clone(), mock_info("sender", &[]), Empty {}).unwrap();

        let proof_bytes =${enc_proof}.to_vec();

        let resp = query(deps.as_ref(), env, QueryMsg::VerifyProof {
            proof_bytes: proof_bytes,
        }).unwrap();
        let resp: VerifyProofResp = from_json(&resp).unwrap();
        assert_eq!(resp, VerifyProofResp {
            verified: true,
        });
    }
}`
    },
    {
        name: "src/verify.rs",
        content: ({ enc_vkey, enc_proof }) => `
use pairing_ce::Engine;
use pairing_ce::bn256::Bn256;

use bellman_ce::ScalarEngine;
use bellman_ce::plonk::better_cs::cs::{PlonkCsWidth4WithNextStepParams};
use bellman_ce::plonk::better_cs::verifier::verify as plonk_verify;
use bellman_ce::plonk::better_cs::keys::{ Proof, VerificationKey };
use bellman_ce::plonk::commitments::transcript::keccak_transcript::RollingKeccakTranscript;
use std::io::{Cursor};

pub fn get_encoded_vkey() -> Vec<u8>{
    ${enc_vkey}.to_vec()
}

pub fn load_verification_key<E: Engine>() -> VerificationKey<E,PlonkCsWidth4WithNextStepParams>{
    let buff = get_encoded_vkey();
    let mut cursor = Cursor::new(buff);
    VerificationKey::<E, PlonkCsWidth4WithNextStepParams>::read(&mut cursor).expect("read vk err")
}

// Load proof from bytes (Vec<u8>)
fn load_proof_from_bytes<E: Engine>(
    buffer: Vec<u8>
) -> Proof<E, PlonkCsWidth4WithNextStepParams> {
    let mut cursor = Cursor::new(buffer);
    Proof::<E, PlonkCsWidth4WithNextStepParams>::read(&mut cursor).expect("read proof err")
}

pub fn verify_proof(proof_bytes: Vec<u8>) -> bool {
    let vkey = load_verification_key::<Bn256>();
    let proof = load_proof_from_bytes::<Bn256>(proof_bytes);

    let result = plonk_verify::<_, _, RollingKeccakTranscript<<pairing_ce::bn256::Bn256 as ScalarEngine>::Fr>>(&proof, &vkey, None);

    return result.expect("fail to verify proof");
}


#[cfg(test)]
mod tests{
    use crate::verify::verify_proof;
   
    pub fn get_proof_vec() -> Vec<u8> {
       ${enc_proof}.to_vec()
    }

#[test]
fn test_verify_proof(){
    let proof_bytes = get_proof_vec();
    
    let result = verify_proof(proof_bytes);
    assert!(result);

}
}

        `
    }

]


module.exports = { dirs, files }