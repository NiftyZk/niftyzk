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
        return ``
    }

    return ""
}

function getHashleaves(merkletree) {
    if (merkletree === "fixed") {
        return ",hashLeaves"
    }
    return ""
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