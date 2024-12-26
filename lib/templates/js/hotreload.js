const { getTestsHashersWithK, getTestsKDeclaration, addKToTestsCompute } = require("./templates");
const { addTestsK } = require("../js/fixedMerkletreeTemplate");


function getInputs(hashfunc, merkletree, extraPublicInputs) {

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

function getHashleaves(merkletree) {
    if (merkletree === "fixed") {
        return ",hashLeaves"
    }
    return ""
}

function getHotReloadDevFile(hashfunc, merkletree, extraPublicInputs) {
    return `import path from "path";
import assert from "assert";
import { wasm as wasm_tester } from "circom_tester";
import { rbigint, generateCommitmentHash, generateNullifierHash${getHashleaves(merkletree)} } from "./lib/index.js";
${merkletree === "fixed" ? `import { encodeForCircuit, generateMerkleProof, generateMerkleTree, getMerkleRootFromMerkleProof, populateTree } from "./lib/merkletree.js";` : ""}

import fs from "fs";

/**
 * This is hot-reload for circom circuit development.
 */

/**
 * Configure the main entry point file here
 */
const MAIN = "circuit.circom";

/**
 * This is function creating the test input, it is generated for the starting circuit.
 * If you update the inputs manually, you need to update this function to match it.
 */
async function getInput() {
${ getInputs(hashfunc, merkletree, extraPublicInputs) }
}

let TESTING = false;

async function testCircuit(filename) {
    if (TESTING) {
        return;
    }

    if (!filename.endsWith(".circom")) {
        return;
    }

    TESTING = true;
    try {
        console.log("Running wasm_tester")

        const circuit = await wasm_tester(path.join(process.cwd(), "circuits", MAIN));

        const witness = await circuit.calculateWitness(await getInput(), true);

        await circuit.checkConstraints(witness);

        //Assert the output of your circuit to test it during development
        // await circuit.assertOut(witness, { out: 0 });

    } catch (err) {
        console.log(err)
    } finally {
        setTimeout(() => { TESTING = false }, 100);
    }

}


async function main() {
    await testCircuit(MAIN);
    console.log("Watching circuits for changes")
    fs.watch(path.join(process.cwd(), "circuits"), async (eventType, filename) => {
        await testCircuit(filename)
    })
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
})`
}

module.exports = { getHotReloadDevFile }