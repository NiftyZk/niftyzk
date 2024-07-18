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
bellman_ce = { git = "https://github.com/DoraFactory/bellman.git" }
group = "0.12.0"
ff = "0.12.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
pairing_ce = { git = "https://github.com/matter-labs/pairing.git" }
ff_ce = "0.14.3"


[dev-dependencies]
cw-multi-test = "0.13.4"`
    },
    // src/lib.rs
    {
        name: "src/lib.rs",
        content: () => `use cosmwasm_std::{
    entry_point, Binary, Deps, DepsMut, Empty, Env, MessageInfo, Response, StdResult,
};

mod parser;
mod types;
mod verify;
mod contract;
mod msg;

pub use types::{ ProofStr, VkeyStr };

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
        proof_str: String,
        pub_input_str: String,
    },
}`},
    //src/parser.rs
    {
        name: "src/parser.rs",
        content: ({ vkey_ic_size, uncompressed_proof }) => {
            const {
                initialization, copyFromSlice, intoAffine, icPush } = getParserIc(vkey_ic_size)

            return `use bellman_ce::groth16::{ Proof, VerifyingKey };
use pairing_ce::bn256::{ G1Affine, G2Affine, G1Uncompressed, G2Uncompressed };
use pairing_ce::bn256::Bn256;
use pairing_ce::{ CurveAffine, Engine, EncodedPoint };
use super::{ ProofStr, VkeyStr };
use crate::verify::{ get_uncompressed_vkey };

pub fn parse_bn_proof<E>(proof_str: String) -> Proof<E>
    where E: Engine<G1Affine = G1Affine, G2Affine = G2Affine>
{
    let pof: ProofStr = serde_json::from_str(&proof_str).unwrap();
    let pi_a = pof.pi_a;
    let pi_b = pof.pi_b;
    let pi_c = pof.pi_c;

    let mut a_arr: [u8; 64] = [0; 64];
    let mut b_arr: [u8; 128] = [0; 128];
    let mut c_arr: [u8; 64] = [0; 64];

    a_arr[..pi_a.len()].copy_from_slice(&pi_a[..]);

    b_arr[..pi_b.len()].copy_from_slice(&pi_b[..]);

    c_arr[..pi_c.len()].copy_from_slice(&pi_c[..]);

    let pia_affine: G1Affine = G1Uncompressed::from_fixed_bytes(a_arr).into_affine().unwrap();
    let pib_affine: G2Affine = G2Uncompressed::from_fixed_bytes(b_arr).into_affine().unwrap();
    let pic_affine: G1Affine = G1Uncompressed::from_fixed_bytes(c_arr).into_affine().unwrap();

    Proof {
        a: pia_affine,
        b: pib_affine,
        c: pic_affine,
    }
}

pub fn parse_bn_vkey<E>(vkey_str: String) -> VerifyingKey<E>
    where E: Engine<G1Affine = G1Affine, G2Affine = G2Affine>
{
    let vk: VkeyStr = serde_json::from_str(&vkey_str).unwrap();
    let vk_alpha_1 = vk.alpha_1;
    let vk_beta_2 = vk.beta_2;
    let vk_gamma_2 = vk.gamma_2;
    let vk_delta_2 = vk.delta_2;
    let vk_ic = vk.ic;

    let mut alpha1: [u8; 64] = [0; 64];
    let mut beta2: [u8; 128] = [0; 128];
    let mut gamma2: [u8; 128] = [0; 128];
    let mut delta2: [u8; 128] = [0; 128];
    
${initialization}
    let mut ic = Vec::new();

    alpha1[..vk_alpha_1.len()].copy_from_slice(&vk_alpha_1[..]);

    beta2[..vk_beta_2.len()].copy_from_slice(&vk_beta_2[..]);

    gamma2[..vk_gamma_2.len()].copy_from_slice(&vk_gamma_2[..]);

    delta2[..vk_delta_2.len()].copy_from_slice(&vk_delta_2[..]);

${copyFromSlice}

    let alpha1_affine = G1Uncompressed::from_fixed_bytes(alpha1).into_affine().unwrap();
    let beta2_affine = G2Uncompressed::from_fixed_bytes(beta2).into_affine().unwrap();
    let gamma2_affine = G2Uncompressed::from_fixed_bytes(gamma2).into_affine().unwrap();
    let delta2_affine = G2Uncompressed::from_fixed_bytes(delta2).into_affine().unwrap();
${intoAffine}

${icPush}

    VerifyingKey {
        alpha_g1: alpha1_affine,
        beta_g1: G1Affine::zero(),
        beta_g2: beta2_affine,
        gamma_g2: gamma2_affine,
        delta_g1: G1Affine::zero(),
        delta_g2: delta2_affine,
        ic,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_verification_key() {
        let vkey_str = get_uncompressed_vkey();
        let _parsed_vkey = parse_bn_vkey::<Bn256>(vkey_str.to_string());
    }
    
    fn get_uncompressed_proof() -> &'static str {
        r#"${uncompressed_proof}"#
    }
    #[test]
    fn test_parse_valid_proof() {
        let proof_str = get_uncompressed_proof();
        let _parsed_proof = parse_bn_proof::<Bn256>(proof_str.to_string());
    }
}
` }
    },
    //src/types.rs
    {
        name: "src/types.rs",
        content: () => `use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ProofStr {
    pub pi_a: Vec<u8>,
    pub pi_b: Vec<u8>,
    pub pi_c: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
pub struct VkeyStr {
    pub alpha_1: Vec<u8>,
    pub beta_2: Vec<u8>,
    pub gamma_2: Vec<u8>,
    pub delta_2: Vec<u8>,
    pub ic: Vec<Vec<u8>>,
}`
    },
    //src/verify.rs
    {
        name: "src/verify.rs",
        content: ({ inputs_length, uncompressed_vkey_str, uncompressed_proof_str, public_input_str }) => {
            const { parsedInputs, FrceInputs } = verifierInputsPrepare(inputs_length);
            return `use pairing_ce::bn256::Bn256;
use ff_ce::PrimeField as Frce;
use crate::parser::{ parse_bn_proof, parse_bn_vkey };

pub fn verify_proof(uncompressed_proof_str: String, public_inputs: String) -> bool {
    let vkey_str = get_uncompressed_vkey();
    let parsed_vkey = parse_bn_vkey::<Bn256>(vkey_str.to_string());

    let pvk = bellman_ce::groth16::prepare_verifying_key(&parsed_vkey);

    let pof = parse_bn_proof::<Bn256>(uncompressed_proof_str);

    let parsed_inputs: [String; ${inputs_length}] = serde_json::from_str(&public_inputs).unwrap();
${parsedInputs}

    let result = bellman_ce::groth16
        ::verify_proof(
            &pvk,
            &pof,
            &[
${FrceInputs}
            ]
        )
        .unwrap();

    return result;
}
pub fn get_uncompressed_vkey() -> &'static str {
    r#"${uncompressed_vkey_str}"#
}

#[cfg(test)]
mod tests {
    use crate::verify::verify_proof;
    fn get_uncompressed_proof() -> &'static str {
        r#"${uncompressed_proof_str}"#
    }
    //TODO: Generate test public inputs
    fn get_public_inputs() -> &'static str {
        r#"${public_input_str}"#
    }

    #[test]
    fn test_verify_proof() {
        let proof_str = get_uncompressed_proof();

        let public_inputs_str = get_public_inputs();

        let result = verify_proof(proof_str.to_string(), public_inputs_str.to_string());
        assert!(result);
    }
}`
        }
    },
    //src/contract.rs
    {
        name: "src/contract.rs",
        content: ({ uncompressed_proof_str, pub_input_str }) => {
            return `use crate::msg::{ GreetResp, QueryMsg, VerifyProofResp };
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
        VerifyProof { proof_str, pub_input_str } =>
            to_json_binary(
                &(VerifyProofResp {
                    verified: verify_proof(proof_str, pub_input_str),
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

        let proof_str =
            r#"${uncompressed_proof_str}"#;
        let pub_input_str =
                r#"${pub_input_str}"#;

        let resp = query(deps.as_ref(), env, QueryMsg::VerifyProof {
            proof_str: proof_str.to_string(),
            pub_input_str: pub_input_str.to_string(),
        }).unwrap();
        let resp: VerifyProofResp = from_json(&resp).unwrap();
        assert_eq!(resp, VerifyProofResp {
            verified: true,
        });
    }
}
`
        }
    }


]

function getParserIc(vkey_ic_size) {
    let initialization = [];
    let copyFromSlice = []
    let intoAffine = []
    let icPush = []

    for (let i = 0; i < vkey_ic_size; i++) {
        initialization.push(`    let mut ic_${i}: [u8; 64] = [0; 64];`)
        copyFromSlice.push(`    ic_${i}[..vk_ic[${i}].len()].copy_from_slice(&vk_ic[${i}][..]);`)
        intoAffine.push(`    let ic${i}_affine = G1Uncompressed::from_fixed_bytes(ic_${i}).into_affine().unwrap();`)
        icPush.push(`    ic.push(ic${i}_affine);`)
    }

    return {
        initialization: initialization.join("\n"),
        copyFromSlice: copyFromSlice.join("\n"),
        intoAffine: intoAffine.join("\n"),
        icPush: icPush.join("\n")
    }
}

function verifierInputsPrepare(inputs_length) {
    let parsedInputs = [];
    let FrceInputs = [];

    for (let i = 0; i < inputs_length; i++) {
        parsedInputs.push(`    let input${i} = parsed_inputs[${i}].as_str();`)
        FrceInputs.push(`                Frce::from_str(input${i}).unwrap(),`)
    }
    return { parsedInputs: parsedInputs.join("\n"), FrceInputs: FrceInputs.join("\n") }
}


module.exports = { dirs, files }