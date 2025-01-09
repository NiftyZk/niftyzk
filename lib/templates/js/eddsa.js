const { addTestsK } = require("./fixedMerkletreeTemplate");

function helpers() {
    return `
/**
 * @returns {Buffer} - Returns a random 32 bit buffer
 */

export function rbytes() { return crypto.randomBytes(32) }

/**
 * @param {string} str - The string to convert to bigint
 * @returns {bigint} - Returns the string as a bigint
 */
export function stringToBigint(str) {
    const buff = Buffer.from(str, "utf8");
    return utils.leBuff2int(buff);
}`
}



function accounts() {

    return `
/**
 *  Build the eddsa object
 * 
*/
export async function getEDDSA() {
    return await buildEddsa();
}

/**
 * The signature parameters used for verifying pedersen hash signed EdDSA
 * @typedef {Object} Account
 * @property {Buffer} prvKey - Private key buffer
 * @property {Uint8Array[]} pubKey - Public key is a tuple of 32 bit Uint8Array
 */

/**
 * @param {any} eddsa - The EdDSA object
 * @returns {Account}
 * Generate a new account which composes of a private and public key
*/
export function generateAccount(eddsa) {
    const prvKey = rbytes();
    const pubKey = eddsa.prv2pub(prvKey);
    return {
        prvKey,
        pubKey
    }
}
/**
 * Import an account private key
 * @param {any} eddsa - The EdDSA object
 * @param {Buffer} prvKey - The private key buffer
 */

export function importAccount(eddsa, prvKey) {
    return {
        prvKey,
        pubKey: eddsa.prv2pub(prvKey)
    }
}`
}

function computeMessagehash(hashfunc, publicInputsArr) {
    const messageTypeProperties = [];

    for (let i = 0; i < publicInputsArr.length; i++) {
        messageTypeProperties.push(` * @property {string | bigint} ${publicInputsArr[i]}`)
    }

    const messageObjType = `
/**
 * @typedef {Object} Message
 * @property {string | bigint} message
${messageTypeProperties.join("\n")}
 */`

    const non_pedersen_data = [];

    for (let i = 0; i < publicInputsArr.length; i++) {
        non_pedersen_data.push(`,\n            BigInt(data.${publicInputsArr[i]})`)
    }

    switch (hashfunc) {
        case "mimc7": {

            return `
/**
 * 
 * @param {Array<bigint>} pubKey - Used for computing an address
 * @param {bigin | number} key -The key used for the mimc7 hash
 * @returns 
 */

export async function getAddressFromPubkey(pubKey, key) {
    return mimc7(pubKey, key);
}

${messageObjType}

/**
 * 
 * @param {Message} data - The data content of the message. The hash of the data object will be signed
 * @param key {number | bigint} - The key used for the mimc7 hash
 * @returns {bigint} Returns a mimc7 hash
 */
export async function computeMessageHash(data, key) {
    return await mimc7(
        [
            BigInt(data.message)${non_pedersen_data.join("")}
        ], key)
}

            
            `}
        case "mimcsponge": {

            return `
/**
 * 
 * @param {Array<bigint>} pubKey - Used for computing an address
 * @param {bigin | number} key -The key used for the mimcSponge hash
 * @returns 
 */

export async function getAddressFromPubkey(pubKey, key) {
    return mimcSponge(pubKey, key);
}


${messageObjType}

/**
 * 
 * @param {Message} data - The data content of the message. The hash of the data object will be signed
 * @param key {number | bigint} - The key used for the mimcSponge hash
 * @returns {bigint} Returns a mimcSponge hash
 */
export async function computeMessageHash(data, key) {
    return await mimcSponge(
        [
            BigInt(data.message)${non_pedersen_data.join("")}
        ], key)
}

            `}
        case "pedersen": {

            let pedersenDataHashing = "";


            if (publicInputsArr.lenght === 0) {
                pedersenDataHashing = "    return await pedersen(utils.leInt2Buff(data.message))"
            } else {

                let props = ["utils.leInt2Buff(data.message, 31)"];

                for (let i = 0; i < publicInputsArr.length; i++) {
                    props.push(`utils.leInt2Buff(data.${publicInputsArr[i]}, 31)`)
                }
                pedersenDataHashing = `    const buff = Buffer.concat([${props.join(", ")}]);\n    return await pedersen(buff);\n`

                return `
/**
 * @param eddsa  - The eddsa implementation
 * @param {Buffer} pubKey - The eddsa public key 
 * @returns - A computed "address" from PubKey
 */

export async function getAddressFromPubkey(eddsa, pubKey) {
    const pPubKey = eddsa.babyJub.packPoint(pubKey);
    return await pedersen(pPubKey)
}

${messageObjType}

/**
 * @param {Message} data - The data content of the message. The hash of the data object will be signed
 * @param message {string | bigint} - The signed message
 * @returns {bigint} Returns a Pedersen hash
 */
export async function computeMessageHash(data) {
${pedersenDataHashing}
}`}
        }
        case "poseidon":
            return `
/**
 * @param {Buffer} pubKey - The eddsa public key 
 * @returns - A computed "address" from PubKey
 */
export async function getAddressFromPubkey(pubKey) {
    return poseidon(pubKey);
}

${messageObjType}

/**
 * @param {Message} data - The data content of the message. The hash of the data object will be signed
 * @param message {string | bigint} - The signed message
 * @returns {bigint} Returns a Poseidon hash
 */
export async function computeMessageHash(data) {
    return await poseidon(
        [
            BigInt(data.message)${non_pedersen_data.join("")}
        ])
}

            `
        default:
            return ``
    }
}


function signMessage(hashfunc) {

    switch (hashfunc) {
        case "mimc7":

            return `
/**
 * @param {any} eddsa - the built EDDSA
 * @param {bigint} messagehash - The poseidon hash of the message
 * @param {Buffer} prvKey - The private key used to sign the message 
 * @returns {Signature} signature
 */
export function signMessage(eddsa, messageHash, prvKey) {
    const signature = eddsa.signMiMC(prvKey, eddsa.F.e(messageHash));
    const pubKey = eddsa.prv2pub(prvKey);
    assert(eddsa.verifyMiMC(eddsa.F.e(messageHash), signature, pubKey))

    return {
        signature,
        pubKey
    }
}
            `
        case "mimcsponge":
            return `

/**
 * @param {any} eddsa - the built EDDSA
 * @param {bigint} messagehash - The poseidon hash of the message
 * @param {Buffer} prvKey - The private key used to sign the message 
 * @returns {Signature} signature
 */
export function signMessage(eddsa, messageHash, prvKey) {
    const signature = eddsa.signMiMCSponge(prvKey, eddsa.F.e(messageHash));
    const pubKey = eddsa.prv2pub(prvKey);
    assert(eddsa.verifyMiMCSponge(eddsa.F.e(messageHash), signature, pubKey))

    return {
        signature,
        pubKey
    }
}
            
            `
        case "poseidon":
            return `
/**
 * @param {any} eddsa - the built EDDSA
 * @param {bigint} messagehash - The poseidon hash of the message
 * @param {Buffer} prvKey - The private key used to sign the message 
 * @returns {Signature} signature
 */
export function signMessage(eddsa, messageHash, prvKey) {
    const signature = eddsa.signPoseidon(prvKey, eddsa.F.e(messageHash));
    const pubKey = eddsa.prv2pub(prvKey);
    assert(eddsa.verifyPoseidon(eddsa.F.e(messageHash), signature, pubKey))

    return {
        signature,
        pubKey
    }
}
            `
        case "pedersen":
            return `
            /**
 * @param {any} eddsa - the built EDDSA
 * @param {bigint} messagehash - The poseidon hash of the message
 * @param {Buffer} prvKey - The private key used to sign the message 
 * @returns {Signature} signature
 */
export function signMessage(eddsa, messageHash, prvKey) {
    const signature = eddsa.signPedersen(prvKey, eddsa.F.e(messageHash));
    const pubKey = eddsa.prv2pub(prvKey);
    assert(eddsa.verifyPedersen(eddsa.F.e(messageHash), signature, pubKey))

    return {
        signature,
        pubKey
    }
}

export function packSignature(eddsa, signature) {
    return eddsa.packSignature(signature);
}

export function unpackSignature(eddsa, pSignature) {
    return eddsa.unpackSignature(pSignature)
}

/**
 *Convert a buffer to bits using this helper function
 */

export function buffer2bits(buff) {
    const res = [];
    for (let i = 0; i < buff.length; i++) {
        for (let j = 0; j < 8; j++) {
            if ((buff[i] >> j) & 1) {
                res.push(1n);
            } else {
                res.push(0n);
            }
        }
    }
    return res;
}
`
        default:
            return ``
    }

    return `


`
}

function getSignatureParameters(hashfunc) {
    if (hashfunc === "pedersen") {
        return `
    /**
 * The signature parameters used for verifying pedersen hash signed EdDSA
 * @typedef {Object} SignatureParameters
 * @property {bigint[]} A
 * @property {bigint[]} R8
 * @property {bigint[]} S
 */

/**
 * @typedef {Object} Signature
 * @property {Uint8Array[]} R8
 * @property {bigint} S
 * /


/**
 * @param {any} eddsa - The built eddsa object
 * @param {Uint8Array[]} pubKey - The public key of the signer
 * @param {Signature} signature - Signature to pack
 * @returns {SignatureParameters} - The signature parameters ready to use for the circuit
 */
export function getSignatureParameters(eddsa, pubKey, signature) {
    const pPubKey = eddsa.babyJub.packPoint(pubKey);
    const pSignature = eddsa.packSignature(signature);
    const r8Bits = buffer2bits(pSignature.slice(0, 32));
    const sBits = buffer2bits(pSignature.slice(32, 64));
    const aBits = buffer2bits(pPubKey);
    return {
        A: aBits,
        R8: r8Bits,
        S: sBits,

    }
}`
    }

    //Pedersen is a special case, but the others have the same signatures

    return `
/**
 * @typedef {Object} SignatureParameters
 * @property {bigint} Ax
 * @property {bigint} Ay
 * @property {bigint} R8x
 * @property {bigint} R8y
 * @property {bigint} S
 */

/**
 * @typedef {Object} Signature
 * @property {Uint8Array[]} R8
 * @property {bigint} S
 * /


/**
 * @param {any} eddsa
 * @param {Uint8Array[]} pubKey - The public key of the account
 * @param {Signature} signature - The signature of the signed message
 * @returns {SignatureParameters} - The signature parameters are prepared parameters, ready to use for the circuit
 */
export function getSignatureParameters(eddsa, pubKey, signature) {
    return {
        Ax: eddsa.F.toObject(pubKey[0]),
        Ay: eddsa.F.toObject(pubKey[1]),
        R8x: eddsa.F.toObject(signature.R8[0]),
        R8y: eddsa.F.toObject(signature.R8[1]),
        S: signature.S
    }
}`

}

function eddsa_generateProof(publicInputsArr, hashfunc, merkletree) {
    let inputDocs = [];
    for (let i = 0; i < publicInputsArr.length; i++) {
        inputDocs.push(` * @param {string |  bigint} options.publicInputs.${publicInputsArr[i]} `)
    }

    let fixedTreeParamsDocs = merkletree === "fixed" ? ` * @param {Array<bigint> | Array<string>} options.pathElements - PathElements contains the merkle proof
 * @param {Array<number>} options.pathIndices - PathIndices is part of the merkle proof` : " *"

    let fixedTreeRootDocs = merkletree === "fixed" ? ` * @param {<bigint | string> } options.publicInputs.root - The merkle root` : " *"

    let fixedPathElementsArgs = merkletree === "fixed" ? `\n        pathElements,
        pathIndices,` : ""

    let kdocs = hashfunc === `mimc7` || hashfunc === "mimcsponge" ? `\n * @param {bigint | string} options.k - The key parameter for the ${hashfunc} hash
` : ""

   let fixedPathElementsFunctionArgs = merkletree === "fixed" ? ` pathElements, pathIndices, ` : ""



    if (hashfunc === "pedersen") {
        return `

/**
 * @param {Object} options - The arguments for the compute proof
 * @param {bigint} options.A - The A parameter from the signature
 * @param {bigint} options.S - The S parameter from the signature
 * @param {bigint} options.R8 - The R8 parameter from the signature
${fixedTreeParamsDocs}
 * @param {Object} options.publicInputs
 * @param {<bigint | string> } options.publicInputs.message - The message property${inputDocs.length !== 0 ? "\n" : ""}${inputDocs.join("\n")}
${fixedTreeRootDocs}
 * @param {Object | undefined} options.snarkArtifacts - Paths to the artifacts used for generating the proof. If undefined, default values will be used. It allows for file system paths and urls.
 * @param {string} options.snarkArtifacts.wasmFilePath - Path to the generated witness file
 * @param {string} options.snarkArtifacts.zkeyFilePath - Path to the generated zKey file
 */
export async function computeProof({ A, S, R8,${addTestsK(hashfunc, "justk")}${fixedPathElementsFunctionArgs}publicInputs, snarkArtifacts }) {
    const input = {
        //Private inputs
        A,
        S,
        R8,${fixedPathElementsArgs}
        ${addTestsK(hashfunc, "justk")} 
        //Public inputs
        ...publicInputs
    }

    if (!snarkArtifacts) {
        snarkArtifacts = {
            wasmFilePath: "circuits/compiled/circuit_js/circuit.wasm",
            zkeyFilePath: "circuits/compiled/zkeys/circuit_final.zkey",
        }
    }

    const { proof, publicSignals } = await groth16.fullProve(
        input,
        snarkArtifacts.wasmFilePath,
        snarkArtifacts.zkeyFilePath
    )

    return { proof, publicSignals }
}`


    } else {


        return `

/**
 * @param {Object} options - The arguments for the compute proof
 * @param {bigint} options.Ax - The Ax parameter from the signature
 * @param {bigint} options.Ay - The Ay parameter from the signature
 * @param {bigint} options.S - The S parameter from the signature
 * @param {bigint} options.R8x - The R8x parameter from the signature
 * @param {bigint} options.R8y - The R8y parameter from the signature${kdocs}
${fixedTreeParamsDocs}
 * @param {Object} options.publicInputs
 * @param {<bigint | string> } options.publicInputs.message - The message property${inputDocs.length !== 0 ? "\n" : ""}${inputDocs.join("\n")}
${fixedTreeRootDocs}
 * @param {Object | undefined} options.snarkArtifacts - Paths to the artifacts used for generating the proof. If undefined, default values will be used. It allows for file system paths and urls.
 * @param {string} options.snarkArtifacts.wasmFilePath - Path to the generated witness file
 * @param {string} options.snarkArtifacts.zkeyFilePath - Path to the generated zKey file
 */
export async function computeProof({ Ax, Ay, S, R8x, R8y,${addTestsK(hashfunc, "justk")}${fixedPathElementsFunctionArgs}publicInputs, snarkArtifacts }) {
    const input = {
        //Private inputs
        Ax,
        Ay,
        S,
        R8x,
        R8y,${fixedPathElementsArgs}
        ${addTestsK(hashfunc, "justk")} 
        //Public inputs
        ...publicInputs
    }

    if (!snarkArtifacts) {
        snarkArtifacts = {
            wasmFilePath: "circuits/compiled/circuit_js/circuit.wasm",
            zkeyFilePath: "circuits/compiled/zkeys/circuit_final.zkey",
        }
    }

    const { proof, publicSignals } = await groth16.fullProve(
        input,
        snarkArtifacts.wasmFilePath,
        snarkArtifacts.zkeyFilePath
    )

    return { proof, publicSignals }
}`
    }
}

module.exports = { helpers, accounts, computeMessagehash, signMessage, getSignatureParameters, eddsa_generateProof }