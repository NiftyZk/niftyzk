const { getTestsHashersWithK, getTestsKDeclaration, addKToTestsCompute } = require("./templates");
const { addTestsK } = require("../js/fixedMerkletreeTemplate");

function getInputsFile(scheme, hashfunc, merkletree, extraPublicInputs) {

    if (scheme === "crs" || scheme === "crs-merkle") {
        return `
import { rbigint, generateCommitmentHash, generateNullifierHash${getHashleaves(merkletree)},buildHashImplementation } from "../lib/index.js";
${merkletree === "fixed" ? `import assert from "assert";
import { encodeForCircuit, generateMerkleProof, generateMerkleTree, getMerkleRootFromMerkleProof, populateTree } from "../lib/merkletree.js";` : ""}
/**
 * This is a test input, generated for the starting circuit.
 * If you update the inputs, you need to update this function to match it.
 */
export async function getInput(){
    await buildHashImplementation();
    ${commitRevealInputs(hashfunc, merkletree, extraPublicInputs)}
}

// Assert the output for hotreload by returning the expected output
// Edit this to fit your circuit
export async function getOutput() {
    return { out: 0 }
}

        `
    }

    if (scheme === "eddsa" || scheme === "eddsa-merkle") {
        return `
import { computeMessageHash${getHashleaves(merkletree)}, generateAccount,getAddressFromPubkey, getEDDSA, getSignatureParameters,rbigint,stringToBigint, signMessage, buildHashImplementation } from "../lib/index.js";
${merkletree === "fixed" ? `import assert from "assert";
import { encodeForCircuit, generateMerkleProof, generateMerkleTree, getMerkleRootFromMerkleProof } from "../lib/merkletree.js";` : ""}
import {utils} from "ffjavascript";

/**
 * This is a test input, generated for the starting circuit.
 * If you update the inputs, you need to update this function to match it.
 */
export async function getInput(){
    ${eddsaInputs(hashfunc, merkletree, extraPublicInputs)}
}

// Assert the output for hotreload by returning the expected output
// Edit this to fit your circuit
export async function getOutput() {
    return { out: 0 }
}

`
    }

    return ""
}

function getHashleaves(merkletree) {
    if (merkletree === "fixed") {
        return ",hashLeaves"
    }
    return ""
}


function eddsaInputs(hashfunc, merkletree, extraPublicInputs) {
    let initializeExtraInputs = [];
    let messageInputs = [];
    for (let i = 0; i < extraPublicInputs.length; i++) {
        initializeExtraInputs.push(`    const ${extraPublicInputs[i]} = rbigint()`)
        messageInputs.push(extraPublicInputs[i]);
    }


    if (merkletree === "no") {

        if (hashfunc === "pedersen") {

            return `
    await buildHashImplementation();
    const eddsa = await getEDDSA();
    const account = generateAccount(eddsa);
    const message = rbigint();
${initializeExtraInputs.join("\n")}
    const messageHash = await computeMessageHash({message${messageInputs.length > 0 ? "," : ""}${messageInputs.join(",")}});
    const signedMessage = signMessage(eddsa, utils.leInt2Buff(messageHash), account.prvKey);
    const signatureParameters = getSignatureParameters(eddsa, account.pubKey, signedMessage.signature)

    return {
        A: signatureParameters.A,
        S: signatureParameters.S,
        R8: signatureParameters.R8,
        message,
        ${extraPublicInputs.join(",\n        ")}
    }`

        } else {
            return `
    await buildHashImplementation()
    const eddsa = await getEDDSA();

    const account = generateAccount(eddsa);
    ${getTestsKDeclaration(hashfunc)}
    const message = rbigint();
${initializeExtraInputs.join("\n")}
    const messageHash = await computeMessageHash({message${messageInputs.length > 0 ? "," : ""}${messageInputs.join(",")}}${addTestsK(hashfunc, "arg")})

    const signedMessage = signMessage(eddsa, messageHash, account.prvKey);

    const signatureParameters = getSignatureParameters(eddsa, account.pubKey, signedMessage.signature)
    
    return {
        Ax: signatureParameters.Ax, 
        Ay: signatureParameters.Ay,
        S: signatureParameters.S,
        R8x: signatureParameters.R8x,
        R8y: signatureParameters.R8y,
        ${addTestsK(hashfunc, "proofArg")}
        ${extraPublicInputs.join(",\n        ")},
        message
    }`
        }


    } else if (merkletree === "fixed") {

        if (hashfunc === "pedersen") {

            return `
    await buildHashImplementation();
    const eddsa = await getEDDSA();

    //We generate a bunch of accounts
    let allAccounts = [];
    //Compute addresses for the accounts that will be stored in a merkle tree
    let allAddresses = [];
    //The merkle tree contains "addresses" computed as the hash of account.pubKey
    for (let i = 0; i < 10; i++) {
        const account = generateAccount(eddsa);
        const address = await getAddressFromPubkey(eddsa, account.pubKey);
        allAccounts.push(account);
        allAddresses.push(address)
    }
    const merkleTree = await generateMerkleTree(allAddresses);
    const merkleProof = await generateMerkleProof(allAddresses[0], structuredClone(allAddresses), merkleTree.tree);
    const encodedProof = encodeForCircuit(merkleProof);
    const message = rbigint();
${initializeExtraInputs.join("\n")}
    const messageHash = await computeMessageHash({message${messageInputs.length > 0 ? "," : ""}${messageInputs.join(",")}})
    const signedMessage = signMessage(eddsa, utils.leInt2Buff(messageHash), allAccounts[0].prvKey);
    const signatureParameters = getSignatureParameters(eddsa, allAccounts[0].pubKey, signedMessage.signature)

    return {
        A: signatureParameters.A,
        S: signatureParameters.S,
        R8: signatureParameters.R8,
        pathElements: encodedProof.pathElements,
        pathIndices: encodedProof.pathIndices,
        message,
        root: merkleTree.root,
        ${extraPublicInputs.join(",\n        ")},
    }`
        } else {
            return `
    await buildHashImplementation();
    const eddsa = await getEDDSA();
    ${getTestsKDeclaration(hashfunc)}
    //We generate a bunch of accounts
    let allAccounts = [];
    //Compute addresses for the accounts that will be stored in a merkle tree
    let allAddresses = [];
    //The merkle tree contains "addresses" computed as the hash of account.pubKey
    for (let i = 0; i < 10; i++) {
        const account = generateAccount(eddsa);
        const address = await getAddressFromPubkey(account.pubKey${addTestsK(hashfunc, "arg")});
        allAccounts.push(account);
        allAddresses.push(address)
    }

    const merkleTree = await generateMerkleTree(allAddresses${addTestsK(hashfunc, "arg")});

    const merkleProof = await generateMerkleProof(allAddresses[0], structuredClone(allAddresses), merkleTree.tree${addTestsK(hashfunc, "arg")});

    const encodedProof = encodeForCircuit(merkleProof);
    const message = rbigint();
${initializeExtraInputs.join("\n")}
    const messageHash = await computeMessageHash({message${messageInputs.length > 0 ? "," : ""}${messageInputs.join(",")}}${addTestsK(hashfunc, "arg")})
    const signedMessage = signMessage(eddsa, messageHash, allAccounts[0].prvKey);

    const signatureParameters = getSignatureParameters(eddsa, allAccounts[0].pubKey, signedMessage.signature)

    return {
        Ax: signatureParameters.Ax,
        Ay: signatureParameters.Ay,
        S: signatureParameters.S,
        R8x: signatureParameters.R8x,
        R8y: signatureParameters.R8y,
        pathElements: encodedProof.pathElements,
        pathIndices: encodedProof.pathIndices,
        root: merkleTree.root,
        ${addTestsK(hashfunc, "proofArg")}
        message,
        ${extraPublicInputs.join(",\n        ")}
    }`
        }


    }

    return ``
}

function commitRevealInputs(hashfunc, merkletree, extraPublicInputs) {
    const hashers = getTestsHashersWithK(hashfunc)

    if (merkletree === "no") {
        return `
    const secret = rbigint();
    const nullifier = rbigint();
    ${getTestsKDeclaration(hashfunc)}
    ${extraPublicInputs.map((inp) => `let ${inp} = rbigint();\n                `).join("")}
    ${hashers}
    
    return {secret, nullifier,${addKToTestsCompute(hashfunc)} nullifierHash, commitmentHash,${extraPublicInputs.join(",")}}`
    }

    if (merkletree === "fixed") {
        return `
        const size = 9;
        ${getTestsKDeclaration(hashfunc)}
        ${extraPublicInputs.map((inp) => `let ${inp} = rbigint();\n                `).join("")}
        const { secrets, nullifiers, commitments, nullifierHashes } = await populateTree(size${addTestsK(hashfunc, "arg")})

        const merkleTree = await generateMerkleTree(structuredClone(commitments)${addTestsK(hashfunc, "arg")});

        const merkleProof = await generateMerkleProof(commitments[0], structuredClone(commitments),null${addTestsK(hashfunc, "arg")});

        const merkleRoot = await getMerkleRootFromMerkleProof(merkleProof${addTestsK(hashfunc, "arg")});
        assert.equal(merkleTree.root, merkleRoot)

        const encodedProof = encodeForCircuit(merkleProof);

        return {
            secret: secrets[0],
            nullifier : nullifiers[0],
            ${addTestsK(hashfunc, "proofArg")}
            pathElements: encodedProof.pathElements, 
            pathIndices: encodedProof.pathIndices,
            root: merkleRoot,
            commitmentHash: commitments[0],
            nullifierHash: nullifierHashes[0],
            ${extraPublicInputs.join(",")}
        }
        `
    }

    return ``
}

module.exports = { getInputsFile }