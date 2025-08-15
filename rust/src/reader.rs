use anyhow::{ bail, format_err };
use byteorder::{ LittleEndian, ReadBytesExt };
use itertools::Itertools;
use std::collections::BTreeMap;
use std::fs::{ File, OpenOptions };
use std::io::{ BufRead, BufReader, Read, Seek, Cursor };
use std::str;

use crate::bellman_ce::{
    kate_commitment::{ Crs, CrsForLagrangeForm, CrsForMonomialForm },
    pairing::{ bn256::Bn256, ff::PrimeField, Engine },
    plonk::{
        better_cs::cs::PlonkCsWidth4WithNextStepParams,
        better_cs::keys::{ Proof, VerificationKey },
    },
    Field,
    PrimeFieldRepr,
};

use crate::circom_circuit::{ CircuitJson, R1CS };

use crate::bindings::{ read_file_sync };

/// Load proof from file using JS FS
pub fn load_proof<E: Engine>(filename: &str) -> Proof<E, PlonkCsWidth4WithNextStepParams> {
    let data = read_file_sync(filename);
    load_proof_from_bytes::<E>(data)
}

/// Load proof from bytes (Vec<u8>)
pub fn load_proof_from_bytes<E: Engine>(
    buffer: Vec<u8>
) -> Proof<E, PlonkCsWidth4WithNextStepParams> {
    let mut cursor = Cursor::new(buffer);
    Proof::<E, PlonkCsWidth4WithNextStepParams>::read(&mut cursor).expect("read proof err")
}

/// load multiple proofs form a list
pub fn load_proofs_from_list<E: Engine>(
    list: &str
) -> Vec<Proof<E, PlonkCsWidth4WithNextStepParams>> {
    let file = File::open(list).expect("read proof list file err");
    let lines: Vec<String> = BufReader::new(file)
        .lines()
        .map(|l| l.expect("could not parse line"))
        .collect();
    let proofs: Vec<Proof<E, PlonkCsWidth4WithNextStepParams>> = lines
        .iter()
        .map(|l| {
            log::info!("reading {:?}", l);
            load_proof::<E>(l)
        })
        .collect();

    assert!(!proofs.is_empty(), "no proof file found!");

    let num_inputs = proofs[0].num_inputs;
    for p in &proofs {
        assert_eq!(p.num_inputs, num_inputs, "proofs num_inputs mismatch!");
    }

    proofs
}

/// Load verification key from file (filename)
pub fn load_verification_key<E: Engine>(
    filename: &str
) -> VerificationKey<E, PlonkCsWidth4WithNextStepParams> {
    let data = read_file_sync(filename);
    load_verification_key_from_bytes::<E>(data)
}

/// Load verification key from bytes (Vec<u8>)
pub fn load_verification_key_from_bytes<E: Engine>(
    buffer: Vec<u8>
) -> VerificationKey<E, PlonkCsWidth4WithNextStepParams> {
    let mut cursor = Cursor::new(buffer);
    VerificationKey::<E, PlonkCsWidth4WithNextStepParams>::read(&mut cursor).expect("read vk err")
}

/// get universal setup file by filename
fn get_universal_setup_file_buff_reader(
    setup_file_name: &str
) -> Result<BufReader<File>, anyhow::Error> {
    let setup_file = File::open(setup_file_name).map_err(|e|
        format_err!("Failed to open universal setup file {}, err: {}", setup_file_name, e)
    )?;
    Ok(BufReader::with_capacity(1 << 29, setup_file))
}

// load monomial form SRS from a file using JS FS
pub fn load_key_monomial_form<E: Engine>(filename: &str) -> Crs<E, CrsForMonomialForm> {
    let file_bytes = read_file_sync(filename);
    let mut cursor = std::io::Cursor::new(file_bytes);
    Crs::<E, CrsForMonomialForm>::read(&mut cursor).expect("read key_monomial_form err")
}

/// load optional lagrange form SRS by filename
pub fn maybe_load_key_lagrange_form<E: Engine>(
    option_filename: Option<String>
) -> Option<Crs<E, CrsForLagrangeForm>> {
    match option_filename {
        None => None,
        Some(filename) => {
            let mut buf_reader = get_universal_setup_file_buff_reader(&filename).expect(
                "read key_lagrange_form file err"
            );
            let key_lagrange_form = Crs::<E, CrsForLagrangeForm>
                ::read(&mut buf_reader)
                .expect("read key_lagrange_form err");
            Some(key_lagrange_form)
        }
    }
}

/// load witness file with autodetect encoding (bin or json)
pub fn load_witness_from_file<E: Engine>(filename: &str) -> Vec<E::Fr> {
    if filename.ends_with("json") {
        load_witness_from_json_file::<E>(filename)
    } else {
        load_witness_from_bin_file::<E>(filename)
    }
}

//It reads the witness from a blob that was passed in by js
pub fn load_witness_from_in_memory_blob<E: Engine>(witness_data: Vec<u8>) -> Vec<E::Fr> {
    load_witness_from_array::<E>(witness_data).expect("read witness failed")
}

/// load witness from JSON file
pub fn load_witness_from_json_file<E: Engine>(filename: &str) -> Vec<E::Fr> {
    let file_bytes = read_file_sync(filename);
    load_witness_from_json::<E, _>(file_bytes.as_slice())
}

/// load witness from JSON bytes
fn load_witness_from_json<E: Engine, R: Read>(reader: R) -> Vec<E::Fr> {
    let witness: Vec<String> = serde_json
        ::from_reader(reader)
        .expect("unable to read witness JSON");
    witness
        .into_iter()
        .map(|x| E::Fr::from_str(&x).unwrap())
        .collect()
}

/// load witness from binary file
pub fn load_witness_from_bin_file<E: Engine>(filename: &str) -> Vec<E::Fr> {
    let file_bytes = read_file_sync(filename);
    load_witness_from_array::<E>(file_bytes).expect("read witness failed")
}

/// load witness from a byte array
pub fn load_witness_from_array<E: Engine>(buffer: Vec<u8>) -> Result<Vec<E::Fr>, anyhow::Error> {
    let cursor = Cursor::new(buffer);
    load_witness_from_bin_reader::<E, _>(cursor)
}
/// load witness from a reader (binary)
fn load_witness_from_bin_reader<E: Engine, R: Read>(
    mut reader: R
) -> Result<Vec<E::Fr>, anyhow::Error> {
    let mut wtns_header = [0u8; 4];
    reader.read_exact(&mut wtns_header)?;
    if wtns_header != [119, 116, 110, 115] {
        bail!("invalid file header");
    }

    let version = reader.read_u32::<LittleEndian>()?;
    log::info!("wtns version {}", version);
    if version > 2 {
        bail!("unsupported file version");
    }

    let num_sections = reader.read_u32::<LittleEndian>()?;
    if num_sections != 2 {
        bail!("invalid number of sections");
    }

    // first section
    let sec_type = reader.read_u32::<LittleEndian>()?;
    if sec_type != 1 {
        bail!("invalid section type");
    }
    let sec_size = reader.read_u64::<LittleEndian>()?;
    if sec_size != 4 + 32 + 4 {
        bail!("invalid section length");
    }
    let field_size = reader.read_u32::<LittleEndian>()?;
    if field_size != 32 {
        bail!("invalid field byte size");
    }
    let mut prime = vec![0u8; field_size as usize];
    reader.read_exact(&mut prime)?;
    if prime != hex!("010000f093f5e1439170b97948e833285d588181b64550b829a031e1724e6430") {
        bail!("invalid curve prime");
    }

    let witness_len = reader.read_u32::<LittleEndian>()?;
    log::info!("witness len {}", witness_len);

    let sec_type = reader.read_u32::<LittleEndian>()?;
    if sec_type != 2 {
        bail!("invalid section type");
    }
    let sec_size = reader.read_u64::<LittleEndian>()?;
    if sec_size != ((witness_len * field_size) as u64) {
        bail!("invalid witness section size {}", sec_size);
    }

    let mut result = Vec::with_capacity(witness_len as usize);
    for _ in 0..witness_len {
        let mut repr = E::Fr::zero().into_repr();
        repr.read_le(&mut reader)?;
        result.push(E::Fr::from_repr(repr)?);
    }

    Ok(result)
}

/// load r1cs file by filename with autodetect encoding (bin or json)
pub fn load_r1cs(filename: &str) -> R1CS<Bn256> {
    if filename.ends_with("json") {
        load_r1cs_from_json_file(filename)
    } else {
        let (r1cs, _wire_mapping) = load_r1cs_from_bin_file(filename);
        r1cs
    }
}

/// load r1cs from json file by filename
fn load_r1cs_from_json_file<E: Engine>(filename: &str) -> R1CS<E> {
    let data = read_file_sync(filename); // WASM-friendly read
    let cursor = Cursor::new(data); // in-memory reader
    load_r1cs_from_json(cursor)
}

/// load r1cs from json by a reader
fn load_r1cs_from_json<E: Engine, R: Read>(reader: R) -> R1CS<E> {
    let circuit_json: CircuitJson = serde_json::from_reader(reader).expect("unable to read.");

    let num_inputs = circuit_json.num_inputs + circuit_json.num_outputs + 1;
    let num_aux = circuit_json.num_variables - num_inputs;

    let convert_constraint = |lc: &BTreeMap<String, String>| {
        lc.iter()
            .map(|(index, coeff)| (index.parse().unwrap(), E::Fr::from_str(coeff).unwrap()))
            .collect_vec()
    };

    let constraints = circuit_json.constraints
        .iter()
        .map(|c| (convert_constraint(&c[0]), convert_constraint(&c[1]), convert_constraint(&c[2])))
        .collect_vec();

    R1CS {
        num_inputs,
        num_aux,
        num_variables: circuit_json.num_variables,
        constraints,
    }
}

/// load r1cs from bin file by filename
fn load_r1cs_from_bin_file(filename: &str) -> (R1CS<Bn256>, Vec<usize>) {
    let data = read_file_sync(filename); // WASM read
    let cursor = Cursor::new(data); // in-memory reader
    load_r1cs_from_bin(cursor)
}
/// load r1cs from bin by a reader
fn load_r1cs_from_bin<R: Read + Seek>(reader: R) -> (R1CS<Bn256>, Vec<usize>) {
    let file = crate::r1cs_file::from_reader(reader).expect("unable to read.");
    let num_inputs = (1 + file.header.n_pub_in + file.header.n_pub_out) as usize;
    let num_variables = file.header.n_wires as usize;
    let num_aux = num_variables - num_inputs;
    (
        R1CS {
            num_aux,
            num_inputs,
            num_variables,
            constraints: file.constraints,
        },
        file.wire_mapping
            .iter()
            .map(|e| *e as usize)
            .collect_vec(),
    )
}
