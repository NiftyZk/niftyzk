function getImports(hashfunc) {
    return `
import { utils } from "ffjavascript";
import crypto from "crypto";
${getHashFuncImport(hashfunc)}
import { groth16 } from "snarkjs";
    
`
}

function getHashFuncImport(hashfunc) {
    switch (hashfunc) {
        case "mimc7":
            return `import { buildMimc7 } from "circomlibjs";`
        case "mimcsponge":
            return `import { buildMimcSponge } from "circomlibjs";`;
        case "poseidon":
            return `import { buildPoseidon } from "circomlibjs";`;
        case "pedersen":
            return `import { buildPedersenHash, buildBabyjub } from "circomlibjs";`
        default:
            break;
    }
}

function getRandom() {
    return `
/**
 * @returns {bigint} Returns a random bigint
 */
export function rbigint() { return utils.leBuff2int(crypto.randomBytes(31)) };
   `
}




function getHashers(hashfunc, merkletree) {
    switch (hashfunc) {
        case "mimc7":
            return getMimc7Hashers(merkletree);
        case "mimcsponge":
            return getMimcSponge(merkletree);
        case "poseidon":
            return getPoseidonHashers(merkletree);
        case "pedersen":
            return getPedersenHashers(merkletree);
        default:
            return ``
    }
}

function getPedersenHashers(merkletree) {
    return `/**
 * @param buff {Buffer} - A list of bigint to compute the hash
 * @returns {bigint} Returns the pedersen hash
 */
export async function pedersen(buff) {
    const hasher = await buildPedersenHash();
    const babyJub = await buildBabyjub();
    const hashBytes = hasher.hash(buff);
    const unpack = babyJub.unpackPoint(hashBytes);
    const hash = babyJub.F.toString(unpack[0])
    return BigInt(hash);
}

/**
 * 
 * @param nullifier {string | bigint} - The nullifier used for the circuit
 * @param secret {string | bigint} - The secret used for the circuit 
 * @returns {bigint} Returns a pedersen hash
 */
export async function generateCommitmentHash(nullifier, secret) {
    const buff = Buffer.concat([utils.leInt2Buff(nullifier, 31), utils.leInt2Buff(secret, 31)]);
    return await pedersen(buff)
}
/**
 * @param nullifier {string | bigint} - The nullifier used for the circuit
 * @returns {bigint} Returns the pedersen hash 
 */
export async function generateNullifierHash(nullifier) {
    return await pedersen(utils.leInt2Buff(nullifier));
}

${pedersenFixedMerkleTreeHasher(merkletree)}
`
}

function pedersenFixedMerkleTreeHasher(merkletree) {
    if (merkletree === "fixed") {
        return `/** Hashes the leaves of a merkle tree from left to right
 * @param left {bigint} - The left leaf node
 * @param right {bigint} - The right leaf node
 */
export async function hashLeaves(left, right) {
    //Pedersen hashed leaves require 32 length when converting to a buffer
    const buff = Buffer.concat([utils.leInt2Buff(left, 32), utils.leInt2Buff(right, 32)]);
    return await pedersen(buff)
}
`}
    return ""
}


function getPoseidonHashers(merkletree) {
    return `/**
 * @param args {Array<bigint>} - A list of bigint to compute the hash
 * @returns {bigint} Returns the poseidon hash
 */
export async function poseidon(args){
    const hasher = await buildPoseidon();
    const hashBytes = hasher(args);
    const hash = hasher.F.toString(hashBytes);
    return BigInt(hash);
}

/**
 * 
 * @param nullifier {string | bigint} - The nullifier used for the circuit
 * @param secret {string | bigint} - The secret used for the circuit 
 * @returns {bigint} Returns a poseidon hash
 */
export async function generateCommitmentHash(nullifier, secret){
    return await poseidon([BigInt(nullifier),BigInt(secret)])
}
/**
 * @param nullifier {string | bigint} - The nullifier used for the circuit
 * @returns {bigint} Returns the poseidon hash 
 */
export async function generateNullifierHash(nullifier){
    return await poseidon([BigInt(nullifier)])
}
    `
}

function getMimc7Hashers(merkletree) {
    return `/**
 * @param arr {Array<bigint>} - A list of bigint to compute the hash
 * @param key - A secret K parameter for the Mimc Hash
 * @returns {bigint} Returns the mimc7 hash
 */
export async function mimc7(arr, key) {
    const hasher = await buildMimc7();
    const hashBytes = hasher.multiHash(arr, key);
    const hash = hasher.F.toString(hashBytes);
    return BigInt(hash);
}

/**
 * 
 * @param nullifier {string | bigint} - The nullifier used for the circuit
 * @param secret {string | bigint} - The secret used for the circuit 
 * @returns {bigint} Returns a mimc7 hash
 */
export async function generateCommitmentHash(nullifier, secret, key) {
    return await mimc7([BigInt(nullifier), BigInt(secret)], key)
}
/**
 * @param nullifier {string | bigint} - The nullifier used for the circuit
 * @returns {bigint} Returns the mimc7 hash 
 */
export async function generateNullifierHash(nullifier, key) {
    return await mimc7([BigInt(nullifier)], key)
}

${mimc7FixedMerkleTreeHasher(merkletree)}
`
}

function mimc7FixedMerkleTreeHasher(merkletree) {
    if (merkletree === "fixed") {
        return `/** Hashes the leaves of a merkle tree from left to right
 * @param left {bigint} - The left leaf node
 * @param right {bigint} - The right leaf node
 * @param key {string | bigint | number} - The key used for the MiMC7 hashing algorithm
 */
export async function hashLeaves(left, right, key) {
    //Pedersen hashed leaves require 32 length when converting to a buffer

    return await mimc7([BigInt(left), BigInt(right)], key)
}`
    }
}

function getMimcSponge(merkletree) {
    return `/**
 * @param arr {Array<bigint>} - A list of bigint to compute the hash
 * @param key - A secret K parameter for the MimcSponge Hash
 * @returns {bigint} Returns the mimcSponge hash
 */
export async function mimcSponge(arr, key) {
    const hasher = await buildMimcSponge();
    const hashBytes = hasher.multiHash(arr, key,1);
    const hash = hasher.F.toString(hashBytes);
    return BigInt(hash);
}

/**
 * 
 * @param nullifier {string | bigint} - The nullifier used for the circuit
 * @param secret {string | bigint} - The secret used for the circuit 
 * @param key {string | bigint | number} - The key used for the MiMCSponge hashing algorithm
 * @returns {bigint} Returns a mimcSponge hash
 */
export async function generateCommitmentHash(nullifier, secret, key) {
    return await mimcSponge([BigInt(nullifier), BigInt(secret)], key)
}
/**
 * @param nullifier {string | bigint} - The nullifier used for the circuit
 * @param key {string | bigint | number} - The key used for the MiMCSponge hashing algorithm
 * @returns {bigint} Returns the mimcSponge hash 
 */
export async function generateNullifierHash(nullifier, key) {
    return await mimcSponge([BigInt(nullifier)], key)
}

${mimcSpongeFixedMerkleTreeHasher(merkletree)}
`
}

function mimcSpongeFixedMerkleTreeHasher(merkletree) {
    if (merkletree === "fixed") {
        return `/** Hashes the leaves of a merkle tree from left to right
 * @param left {bigint} - The left leaf node
 * @param right {bigint} - The right leaf node
 * @param key {string | bigint | number} - The key used for the MiMCSponge hashing algorithm
 */
export async function hashLeaves(left, right, key) {
    //Pedersen hashed leaves require 32 length when converting to a buffer

    return await mimcSponge([BigInt(left), BigInt(right)], key)
}`
    }
}

function getGenerateProof(extraPublicInputs, hashfunc, merkletree) {
    const publicInputParams = extraPublicInputs.map((inp) => `\n * @param {bigint | string} options.publicInputs.${inp}`).join(" ")
    return `
/**
 * @param {Object} options - The arguments for the compute proof
 * @param {bigint | string} options.secret - The secret used for the commitment reveal scheme
 * @param {bigint | string} options.nullifier${fixedTreeProofDocs(merkletree, 1)}
 * ${addKDocs(hashfunc)}
 * @param {Object} options.publicInputs
 * @param {bigint | string} options.publicInputs.commitmentHash
 * @param {bigint | string} options.publicInputs.nullifierHash${extraPublicInputs.length === 0 ? " *" : publicInputParams} - The nullifier used for mitigating replay attacks${fixedTreeProofDocs(merkletree, 2)}
 * @param {Object | undefined} options.snarkArtifacts - Paths to the artifacts used for generating the proof. If undefined, default values will be used. It allows for file system paths and urls.
 * @param {string} options.snarkArtifacts.wasmFilePath - Path to the generated witness file
 * @param {string} options.snarkArtifacts.zkeyFilePath - Path to the generated zKey file
 */ 
export async function computeProof({secret, nullifier,${fixedTreeProofFuncArg(merkletree)}${addKVar(hashfunc)} publicInputs, snarkArtifacts}){
    const input = {
      //Private inputs
      secret,
      nullifier,
      ${fixedTreeProofFuncArg(merkletree)}
      ${addKVar(hashfunc)}
      //Public inputs
      ...publicInputs        
    }

    if(!snarkArtifacts){
        snarkArtifacts = {
            wasmFilePath: "circuits/compiled/circuit_js/circuit.wasm", 
            zkeyFilePath: "circuits/compiled/zkeys/circuit_final.zkey",
        }
       }

    const {proof, publicSignals} = await groth16.fullProve(
        input,
        snarkArtifacts.wasmFilePath,
        snarkArtifacts.zkeyFilePath
       )

    return {proof, publicSignals}
}
    `
}

function fixedTreeProofDocs(merkletree, line) {
    if (merkletree !== "fixed") {
        return;
    }
    if (line === 1) {
        return `\n * @param {Array<bigint> | Array<string>} options.pathElements
 * @param {Array<number>} options.pathIndices`
    }

    if (line === 2) {
        return `\n * @param {bigint | string} options.publicInputs.root - The root hash of the merkle tree
`
    }
}

function fixedTreeProofFuncArg(merkletree) {
    if (merkletree !== "fixed") {
        return ""
    }
    return "pathElements, pathIndices, "
}

function addKVar(hashfunc) {
    return hashfunc === "mimc7" || hashfunc === "mimcsponge" ? "k," : "";
}

function addKDocs(hashfunc) {
    return hashfunc === "mimc7" || hashfunc === "mimcsponge" ? "@param {bigint | string} options.k - The key parameter for the MiMC7 hash" : "";
}

function getVerifyProof() {
    return `/**
 * Verifies a SnarkJS proof.
 * @param verificationKey The zero-knowledge verification key.
 * @param fullProof The SnarkJS full proof.
 * @returns {boolean} True if the proof is valid, false otherwise.
 */

export function verifyProof({verificationKey, proof, publicSignals }) {
    return groth16.verify(
        verificationKey,
        publicSignals,
        proof,
    );
}
`
}


function getTests(extraPublicInputs, hashfunc) {
    return `
    import assert from "assert";
    import {rbigint, generateCommitmentHash, generateNullifierHash, computeProof, verifyProof} from "../lib/index";
    import fs from "fs";

    it("test commitment-reveal scheme", async function(){
        const secret = rbigint();
        const nullifier = rbigint();
        ${getTestsKDeclaration(hashfunc)}
        ${getTestsHashersWithK(hashfunc)}
        ${extraPublicInputs.map((inp) => `let ${inp} = rbigint();\n                `).join("")}
        //When compiling the tests via \`niftyzk verificationkey\` the path of the zkey used is written into a file so you don't have to adjust the tests when using different zkeys
        const zkeyPath = fs.readFileSync("circuits/compiled/vk_meta.txt", "utf-8")
        const {proof, publicSignals} = await computeProof(
            {
                secret, 
                nullifier,
                ${addKToTestsCompute(hashfunc)} 
                publicInputs: {
                    commitmentHash, 
                    nullifierHash,
                    ${extraPublicInputs.join(",")}
                },
                snarkArtifacts: {             
                    wasmFilePath: "circuits/compiled/circuit_js/circuit.wasm", 
                    zkeyFilePath: zkeyPath,
                }
            })
            const verificationKeyFile = fs.readFileSync("circuits/compiled/verification_key.json", "utf-8");
            const verificationKey = JSON.parse(verificationKeyFile);
            const result = await verifyProof({verificationKey, proof, publicSignals})
            assert.equal(result, true)

            //Write the tested proof, publicSignals and verificationKey to a file. This will be used for generating tests for the cosmwasm verifier contracts.
            fs.writeFileSync("./circuits/compiled/test_proof.json", JSON.stringify({ proof, publicSignals, verificationKey }))
        })
    `
}



function getTestsKDeclaration(hashfunc) {
    return hashfunc === "mimc7" || hashfunc === "mimcsponge" ? "const key = 313; // just an example key for tests" : ""
}

function getTestsHashersWithK(hashfunc) {
    return hashfunc === "mimc7" || hashfunc === "mimcsponge" ? `const commitmentHash = await generateCommitmentHash(nullifier, secret, key);
    const nullifierHash = await generateNullifierHash(nullifier, key);` : `const commitmentHash = await generateCommitmentHash(nullifier, secret);
    const nullifierHash = await generateNullifierHash(nullifier);`
}

function addKToTestsCompute(hashfunc) {
    return hashfunc === "mimc7" || hashfunc === "mimcsponge" ? "k: key," : ""
}


function getJsLib(extraPublicInputs, hashfunc, merkletree) {
    const imports = getImports(hashfunc);
    const random = getRandom();
    const hashers = getHashers(hashfunc, merkletree);
    const generateProof = getGenerateProof(extraPublicInputs, hashfunc, merkletree);
    const verifyProof = getVerifyProof();
    return `${imports}${random}${hashers}${generateProof}${verifyProof}`
}

module.exports = { getJsLib, getTests }