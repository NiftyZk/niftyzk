
const { addTestsK } = require("./fixedMerkletreeTemplate");
const { helpers, accounts, computeMessagehash, signMessage, getSignatureParameters, eddsa_generateProof } = require("./eddsa");


function getImports(hashfunc, scheme) {
    return `
import { utils } from "ffjavascript";
import crypto from "crypto";
import assert from "assert";
${getHashFuncImport(hashfunc, scheme)}
import { groth16 } from "snarkjs";
    
`
}

function getHashFuncImport(hashfunc, scheme) {
    const importEddsa = scheme === "eddsa" || scheme === "eddsa-merkle" || scheme === "smt-eddsa-inc/exc" || scheme === "smt-eddsa-ins/upd/del" ? `buildEddsa,` : ""
    switch (hashfunc) {
        case "mimc7":
            return `import {${importEddsa} buildMimc7 } from "circomlibjs";`
        case "mimcsponge":
            return `import {${importEddsa} buildMimcSponge } from "circomlibjs";`;
        case "poseidon":
            return `import {${importEddsa} buildPoseidon } from "circomlibjs";`;
        case "pedersen":
            return `import {${importEddsa} buildPedersenHash, buildBabyjub } from "circomlibjs";`
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




function getHashers(hashfunc, merkletree, addCommitmentHasher) {
    switch (hashfunc) {
        case "mimc7":
            return getMimc7Hashers(merkletree, addCommitmentHasher);
        case "mimcsponge":
            return getMimcSponge(merkletree, addCommitmentHasher);
        case "poseidon":
            return getPoseidonHashers(merkletree, addCommitmentHasher);
        case "pedersen":
            return getPedersenHashers(merkletree, addCommitmentHasher);
        default:
            return ``
    }
}

function getPedersenHashers(merkletree, addCommitmentHasher) {
    return `
//The hash implementation is stored local scoped to avoid rebuilding it multiple times
let hashimpl = null;

/**
 * Builds the hashing algorithm
 */
export async function buildHashImplementation() {
    if (!hashimpl) {
        const hasher = await buildPedersenHash();
        const babyJub = await buildBabyjub();
        hashimpl = { hasher, babyJub };
    }
}

/**
 * @param buff {Buffer} - A list of bigint to compute the hash
 * @returns {bigint} Returns the pedersen hash
 */
export async function pedersen(buff) {
    const hashBytes = hashimpl.hasher.hash(buff);
    const unpack = hashimpl.babyJub.unpackPoint(hashBytes);
    const hash = hashimpl.babyJub.F.toString(unpack[0])
    return BigInt(hash);
}
${addCommitmentHasher ? `/**
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
}` : ""}

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


function getPoseidonHashers(merkletree, addCommitmentHasher) {
    return `
//The hash implementation is stored local scoped to avoid rebuilding it multiple times
let hashimpl = null;

/**
 * Builds the hashing algorithm
 */
export async function buildHashImplementation() {
    if (!hashimpl) {
        const hasher = await buildPoseidon();
        hashimpl = { hasher };
    }
}

/**
* @param args {Array<bigint>} - A list of bigint to compute the hash
* @returns {bigint} Returns the poseidon hash
*/
export async function poseidon(args) {
    const hashBytes = hashimpl.hasher(args);
    const hash = hashimpl.hasher.F.toString(hashBytes);
    return BigInt(hash);
}
${addCommitmentHasher ? `
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
`: ""}
${poseidonFixedMerkleTreeHasher(merkletree)}
    `
}

function poseidonFixedMerkleTreeHasher(merkletree) {
    if (merkletree === "fixed") {
        return `/** Hashes the leaves of a merkle tree from left to right
 * @param left {bigint} - The left leaf node
 * @param right {bigint} - The right leaf node
 * @returns {bigint} - Returns the poseidon hash
 */
export async function hashLeaves(left, right) {
    return await poseidon([BigInt(left), BigInt(right)]);
}`
    }
    return "";
}

function getMimc7Hashers(merkletree, addCommitmentHasher) {
    return `
//The hash implementation is stored local scoped to avoid rebuilding it multiple times
let hashimpl = null;

/**
 * Builds the hashing algorithm
 */
export async function buildHashImplementation() {
    if (!hashimpl) {
        const hasher = await buildMimc7();
        hashimpl = { hasher };
    }
}
    
    
/**
 * @param arr {Array<bigint>} - A list of bigint to compute the hash
 * @param key - A secret K parameter for the Mimc Hash
 * @returns {bigint} Returns the mimc7 hash
 */
export async function mimc7(arr, key) {
    const hashBytes = hashimpl.hasher.multiHash(arr, key);
    const hash = hashimpl.hasher.F.toString(hashBytes);
    return BigInt(hash);
}
${addCommitmentHasher ? `
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
`: ""}
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

    return await mimc7([BigInt(left), BigInt(right)], key)
}`
    }
    return ``
}

function getMimcSponge(merkletree, addCommitmentHasher) {
    return `
//The hash implementation is stored local scoped to avoid rebuilding it multiple times
let hashimpl = null;

/**
 * Builds the hashing algorithm
 */
export async function buildHashImplementation() {
    if (!hashimpl) {
        const hasher = await buildMimcSponge();
        hashimpl = { hasher };
    }
}


/**
 * @param arr {Array<bigint>} - A list of bigint to compute the hash
 * @param key - A secret K parameter for the MimcSponge Hash
 * @returns {bigint} Returns the mimcSponge hash
 */
export async function mimcSponge(arr, key) {
    const hashBytes = hashimpl.hasher.multiHash(arr, key,1);
    const hash = hashimpl.hasher.F.toString(hashBytes);
    return BigInt(hash);
}
${addCommitmentHasher ? `
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
`: ""}
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
 * @param {bigint | string} options.publicInputs.nullifierHash - The nullifier used for mitigating replay attacks${extraPublicInputs.length === 0 ? " *" : publicInputParams} ${fixedTreeProofDocs(merkletree, 2)}
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
        return "";
    }
    if (line === 1) {
        return `\n * @param {Array<bigint> | Array<string>} options.pathElements
 * @param {Array<number>} options.pathIndices`
    }

    if (line === 2) {
        return `\n * @param {bigint | string} options.publicInputs.root - The root hash of the merkle tree
`
    }
    return "";
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

function getTests(extraPublicInputs, hashfunc, scheme) {

    let getInputOut = '';
    let title = ``
    let computeProofIn = ``;

    if (scheme === "crs") {
        title = "Test commit-reveal scheme"
        getInputOut = `const {secret,nullifier,${addTestsK(hashfunc, "justk")}commitmentHash,nullifierHash,${extraPublicInputs.join(",")}}`
        computeProofIn = `
        secret, 
        nullifier,
        ${addTestsK(hashfunc, "justk")} 
        publicInputs: {
            commitmentHash, 
            nullifierHash,
            ${extraPublicInputs.join(",\n                ")}
        },
`
    }

    if (scheme === "crs-merkle") {
        title = "Test commit-reveal scheme with fixed merkle tree"
        getInputOut = `const {secret, nullifier,${addTestsK(hashfunc, "justk")}pathElements,pathIndices,root,commitmentHash,nullifierHash,${extraPublicInputs.join(",")}}`
        computeProofIn = `
        secret,
        nullifier,${addTestsK(hashfunc, "justk")}
        pathElements,
        pathIndices,
        publicInputs: {
            root,
            commitmentHash,
            nullifierHash,
            ${extraPublicInputs.join(",\n                ")}
        },`
    }

    if (scheme === "eddsa") {
        title = "Test EdDSA signature"
        if (hashfunc === "pedersen") {

            getInputOut = `const {A,S,R8,message,${extraPublicInputs.join(",")}}`
            computeProofIn = `
            A,
            S,
            R8,
            publicInputs:{
                message,
                ${extraPublicInputs.join(",\n                ")}
            },`

        } else {
            getInputOut = `const {Ax,Ay,S,R8x,R8y,${addTestsK(hashfunc, "justk")}message,${extraPublicInputs.join(",")}}`
            computeProofIn = `
            Ax,
            Ay,
            S,
            R8x,
            R8y,
            ${addTestsK(hashfunc, "justk")}
            publicInputs:{
                message,
                ${extraPublicInputs.join(",\n                ")}
            },`
        }



    }

    if (scheme === "eddsa-merkle") {
        title = "Test EdDSA signature with fixed merkle tree"

        if (hashfunc === "pedersen") {
            getInputOut = `const {A,S,R8,pathElements,pathIndices, message,root,${extraPublicInputs.join(",")}}`
            computeProofIn = `
            A,
            S,
            R8,
            pathElements,
            pathIndices,
            publicInputs: {
                message,
                root,
                ${extraPublicInputs.join(",\n                ")}
            },`
        } else {
            getInputOut = `const {Ax,Ay,S,R8x,R8y,pathElements,pathIndices,${addTestsK(hashfunc, "justk")}root,message,${extraPublicInputs.join(",")}}`
            computeProofIn = `
            Ax,
            Ay,
            S,
            R8x,
            R8y,
            ${addTestsK(hashfunc, "justk")}
            pathElements,
            pathIndices,
            publicInputs: {
                message,
                root,
                ${extraPublicInputs.join(",\n                ")}
            },`
        }


    }

    if (scheme === "smt-eddsa-inc/exc") {
        title = "Test Sparse Merkle Tree inclusion/exclusion with EdDSA"

        if (hashfunc === "pedersen") {
            getInputOut = `const {A,S,R8,root, siblings, fnc, oldValue, oldKey, isOld0, value, message,${extraPublicInputs.join(",")}}`
            computeProofIn = `
            A,
            S,
            R8,
            siblings,
            oldValue,
            oldKey,
            isOld0,
            publicInputs: {
                message,
                value,
                fnc,
                root,
                ${extraPublicInputs.join(",\n                ")}
            },`

        } else {
            getInputOut = `const {Ax,Ay,S,R8x,R8y,siblings,fnc,oldValue,oldKey,isOld0,value, ${addTestsK(hashfunc, "justk")}root,message,${extraPublicInputs.join(",")}}`
            computeProofIn = `
            Ax,
            Ay,
            S,
            R8x,
            R8y,
            siblings,
            fnc,
            oldValue,
            oldKey,
            isOld0,
            ${addTestsK(hashfunc, "justk")}
            publicInputs: {
                value,
                fnc,
                message,
                root,
                ${extraPublicInputs.join(",\n                ")}
            },`
        }

    }

    if (scheme === "smt-eddsa-ins/upd/del") {
        title = "Test Sparse Merkle Tree insert/update/delete with EdDSA"

        if (hashfunc === "pedersen") {
            getInputOut = `const {A, S, R8, oldRoot, siblings, fnc, oldValue, oldKey, isOld0, newKey, newValue, message,${extraPublicInputs.join(",")}}`
            computeProofIn = `
            A,
            S,
            R8,
            siblings,
            oldValue,
            oldKey,
            isOld0,
            publicInputs: {
                message,
                newKey,
                newValue,
                fnc,
                oldRoot,
                ${extraPublicInputs.join(",\n                ")}
            },`
        } else {
            getInputOut = `const {Ax,Ay,S,R8x,R8y,oldRoot,siblings,fnc,oldValue,oldKey,isOld0,newKey,newValue,${addTestsK(hashfunc, "justk")}message,${extraPublicInputs.join(",")}}`
            computeProofIn = `
            Ax,
            Ay,
            S,
            R8x,
            R8y,
            siblings,
            fnc,
            oldValue,
            oldKey,
            isOld0,
            ${addTestsK(hashfunc, "justk")}
            publicInputs: {
                newKey,
                newValue,
                fnc,
                message,
                oldRoot,
                ${extraPublicInputs.join(",\n                ")}
            },`
        }
    }


    return `
    import assert from "assert";
    import {computeProof, verifyProof} from "../lib/index";
    import fs from "fs";
    import { getInput } from "./input.js";

    it(\"${title}\", async function(){
        ${getInputOut} = await getInput();
        //When compiling the tests via \`niftyzk verificationkey\` the path of the zkey used is written into a file so you don't have to adjust the tests when using different zkeys
        const zkeyPath = fs.readFileSync("circuits/compiled/vk_meta.txt", "utf-8")
        const {proof, publicSignals} = await computeProof({
${computeProofIn}
                snarkArtifacts: {             
                    wasmFilePath: "circuits/compiled/circuit_js/circuit.wasm", 
                    zkeyFilePath: zkeyPath,
                }
            })
            const verificationKeyFile = fs.readFileSync("circuits/compiled/verification_key.json", "utf-8");
            const verificationKey = JSON.parse(verificationKeyFile);
            const result = await verifyProof({verificationKey, proof, publicSignals})
            assert.equal(result, true)
        },50000)
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

function getJsLib(scheme, extraPublicInputs, hashfunc, merkletree) {
    if (scheme === "crs" || scheme === "crs-merkle") {
        const imports = getImports(hashfunc, scheme);
        const random = getRandom();
        const hashers = getHashers(hashfunc, merkletree, true);
        const generateProof = getGenerateProof(extraPublicInputs, hashfunc, merkletree);
        const verifyProof = getVerifyProof();
        return `${imports}${random}${hashers}${generateProof}${verifyProof}`
    } else if (
        scheme === "eddsa" || scheme === "eddsa-merkle"
    ) {
        const imports = getImports(hashfunc, scheme);
        const random = getRandom();
        const hashers = getHashers(hashfunc, merkletree, false);
        const accountAndMessageHelpers = helpers()
        const acc = accounts();
        const compute_hash = computeMessagehash(hashfunc, extraPublicInputs);
        const signSsg = signMessage(hashfunc);
        const sigParams = getSignatureParameters(hashfunc);

        const generateProof = eddsa_generateProof(extraPublicInputs, hashfunc, merkletree, scheme);
        const verifyProof = getVerifyProof();

        return `${imports}${random}${hashers}${accountAndMessageHelpers}${acc}${compute_hash}${signSsg}${sigParams}${generateProof}${verifyProof}`
    } else if (
        scheme === "smt-eddsa-inc/exc" || scheme === "smt-eddsa-ins/upd/del"
    ) {
        const imports = getImports(hashfunc, scheme)
        const random = getRandom();
        const hashers = getHashers(hashfunc, merkletree, false);
        const accountAndMessageHelpers = helpers();
        const acc = accounts();
        const compute_hash = computeMessagehash(hashfunc, extraPublicInputs);
        const signSsg = signMessage(hashfunc);
        const sigParams = getSignatureParameters(hashfunc);
        const generateProof = eddsa_generateProof(extraPublicInputs, hashfunc, merkletree, scheme)

        const verifyProof = getVerifyProof();

        //TODO: Implement this for the SMT!
        //TODO: imports
        //to
        return `${imports}${random}${hashers}${accountAndMessageHelpers}${acc}${compute_hash}${signSsg}${sigParams}${generateProof}${verifyProof}`
    }


}

module.exports = { getJsLib, getTests, getTestsHashersWithK, getTestsKDeclaration, addKToTestsCompute }