function getFixedMerkleTreeTemplate(hashfunc, addCommitmentHasher) {
    return `
    import { hashLeaves, rbigint ${addCommitmentHasher ? `,generateNullifierHash, generateCommitmentHash}` : "}"} from "./index.js";

/**
 * The TREELEVELS constant specifies the size of the tree and it's levels and merkle proof size.
 * This variable is required to be a constant by the circom circuit
 * If you adjust this variable, make sure to change the levels in the circuit
 */
const TREELEVELS = 20;

const HashDirection = {
    LEFT: 0,
    RIGHT: 1

}

/**
 * @typedef {Object} MerkleProofParams
 * @property {bigint} hash
 * @property {number} direction
 */

/**
 * @typedef {Array<MerkleProofParams>} MerkleProof 
 */

/**
 * Generate a merkle root using recursion and write the tree in to the tree argument object
 * @param {Array<bigint>} leaves - The bottom leaves of the merkle tree
 * @param {Object} tree - The whole tree is stored in this object and written per layer
 * @param {Array<Array<bigint>>} leaves.layer
${addFixedMerkleTreeK(hashfunc, "type")}
 * @returns {Array<bigint>} - The merkle root, which is an array with a single element
 */
export async function generateMerkleRoot(leaves, tree${addFixedMerkleTreeK(hashfunc, "arg")}) {
    if (leaves.length === 0) {
        return [];
    }
    // Duplicate the last leaf if the tree is uneven
    ensureEven(leaves);
    const combinedHashes = [];
    for (let i = 0; i < leaves.length; i += 2) {
        const newHash = await hashLeaves(leaves[i], leaves[i + 1]${addFixedMerkleTreeK(hashfunc, "arg")})
        combinedHashes.push(newHash)

    }
    tree.layers.push(combinedHashes);
    // if the combined hashes length is 1 then we have the merkle root
    if (combinedHashes.length === 1) {
        return combinedHashes;
    }
    return await generateMerkleRoot(combinedHashes, tree${addFixedMerkleTreeK(hashfunc, "arg")});
}

/**
 * Computes the merkle tree using the leaves
 * @param {Array<bigint>} leaves - The merkle tree leaves
${addFixedMerkleTreeK(hashfunc, "type")}
 * @returns - The merkle tree and the root
 */
export async function generateMerkleTree(leaves${addFixedMerkleTreeK(hashfunc, "arg")}) {
    const tree = { layers: [leaves] }
    await generateMerkleRoot(leaves, tree${addFixedMerkleTreeK(hashfunc, "arg")});
    // Padding the tree here so we can use it in circom with a hard coded 20 level tree
    return await padTree(tree${addFixedMerkleTreeK(hashfunc, "arg")});
}



/**
 * Compute the merkle proof using a leaf and the leaves
 * @param {bigint} leaf - The leaf we compute proof for
 * @param {Array<bigint>} leaves - The leaf nodes of the merkle tree
 * @param {Array<Array<bigint>> | null} cachedTree - The cached merkle tree
${addFixedMerkleTreeK(hashfunc, "type")}
 * @returns {MerkleProof | null} - Returns the valid merkle proof or returns null if the leaves are empty
 */

export async function generateMerkleProof(leaf, leaves, cachedTree${addFixedMerkleTreeK(hashfunc, "arg")}) {
    if (!leaf || !leaves || leaves.length === 0) {
        return null;
    }
    const { tree } = cachedTree !== null ? { tree: cachedTree } : await generateMerkleTree(leaves${addFixedMerkleTreeK(hashfunc, "arg")});

    const merkleProof = [{
        hash: leaf,
        direction: getLeafNodeDirectionInMerkleTree(leaf, tree.layers)
    }];
    let hashIndex = tree.layers[0].findIndex(h => h === leaf);
    for (let level = 0; level < tree.layers.length - 1; level++) {
        const isLeftChild = hashIndex % 2 === 0;
        const siblingDirection = isLeftChild ? HashDirection.RIGHT : HashDirection.LEFT;
        const siblingIndex = isLeftChild ? hashIndex + 1 : hashIndex - 1;
        const siblingNode = {
            hash: tree.layers[level][siblingIndex],
            direction: siblingDirection
        };
        merkleProof.push(siblingNode);
        hashIndex = Math.floor(hashIndex / 2);
    }
    return merkleProof;
}

/**
 * Reduces the merkle proof to a root
 * @param {MerkleProof} merkleProof
${addFixedMerkleTreeK(hashfunc, "type")}
 * @returns The merkle root
 */

// Reduce the merkle proof to a root by hashing the leaves and determining direction!
export async function getMerkleRootFromMerkleProof(merkleProof${addFixedMerkleTreeK(hashfunc, "arg")}) {
    let accumulator = { hash: merkleProof[0].hash };
    for (let i = 1; i < merkleProof.length; i++) {
        const node = merkleProof[i];
        if (node.direction === HashDirection.RIGHT) {
            const hash = await hashLeaves(accumulator.hash, node.hash${addFixedMerkleTreeK(hashfunc, "arg")});
            accumulator = { hash }
        } else {
            const hash = await hashLeaves(node.hash, accumulator.hash${addFixedMerkleTreeK(hashfunc, "arg")});
            accumulator = { hash }
        }
    }
    return accumulator.hash;
}

/**
 * @typedef {Object} EncodedForCircuit
 * @property {Array<bigint>} pathElements
 * @property {Array<number>} pathIndices
 */


/**
 * Encode the merkle proof to a format used by the circom circuit
 * @param {MerkleProof} merkleProof
 * @returns {EncodedForCircuit}
 */

export function encodeForCircuit(merkleProof) {
    let pathElements = [];
    let pathIndices = [];
    for (let i = 0; i < merkleProof.length; i++) {
        let path = merkleProof[i];
        pathElements.push(path.hash);
        pathIndices.push(path.direction);

    }

    return { pathElements, pathIndices }
}

/**
 * Internal function, gets the leaf node's direction in the tree
 * @param {bigint} leaf 
 * @param {bigint[][]} merkleTree 
 * @returns 
 */

const getLeafNodeDirectionInMerkleTree = (leaf, merkleTree) => {
    const hashIndex = merkleTree[0].findIndex(h => h === leaf);
    return hashIndex % 2 === 0 ? HashDirection.LEFT : HashDirection.RIGHT;
};

/**
 * Pads the merkle tree as needed to fit the circuit. The padding is determined by TREELEVELS an will duplicate the last root
 * @param {Object} tree - The merkle tree
 * @param {bigint[][]} tree.layers - The layers of the tree
${addFixedMerkleTreeK(hashfunc, "type")}
 * @returns - The merkle tree and the root
 */
async function padTree(tree${addFixedMerkleTreeK(hashfunc, "arg")}) {
    for (let i = tree.layers.length - 1; i < TREELEVELS - 1; i++) {
        const lastRoot = tree.layers[i][0];
        tree.layers[i].push(lastRoot);
        const newRoot = await hashLeaves(lastRoot, lastRoot${addFixedMerkleTreeK(hashfunc, "arg")});
        tree.layers.push([newRoot]);
    }

    return {
        tree,
        root: tree.layers[tree.layers.length - 1][0]
    };
}

/**
 * Ensures the merkle tree layer is of even size and will duplicate the last leaf if need
 * @param {Array<bigint>} leaves 
 */
function ensureEven(leaves) {
    if (leaves.length % 2 !== 0) {
        leaves.push(leaves[leaves.length - 1]);
    }
}



export function serializeMerkleTree(tree) {
    return JSON.stringify(tree, (_, v) => typeof v === "bigint" ? v.toString() : v);
}

/**
 * @typedef {Object} TreeSecrets
 * @property {Array<BigInt>} secrets
 * @property {Array<BigInt>} nullifiers
 * @property {Array<BigInt>} commitments
 * @property {Array<Bigint>} nullifierHashes
 */

${addCommitmentHasher ? `

/**
 * Generates tree leaves which consist of commitments and nullifiers and the hashes for them
 * Use this function to pre-populate a merkle tree
 * @param {number} size - The amount of commitments to generate
${addFixedMerkleTreeK(hashfunc, "type")}
 * @returns {TreeSecrets}  - Returns the secrets used for the merkle tree
 */
export async function populateTree(size${addFixedMerkleTreeK(hashfunc, "arg")}) {
    const secrets = [];
    const nullifiers = [];
    const commitments = []; //commitments are the bottom leaves of the tree.
    const nullifierHashes = [];

    //Initialize the tree and create the bottom leaves
    for (let i = 0; i < size; i++) {
        let secret = rbigint();
        let nullifier = rbigint();
        secrets.push(secret);
        nullifiers.push(nullifier);

        let nullifierHash = await generateNullifierHash(nullifier${addFixedMerkleTreeK(hashfunc, "arg")});
        nullifierHashes.push(nullifierHash);

        const commitment = await generateCommitmentHash(nullifier, secret${addFixedMerkleTreeK(hashfunc, "arg")})
        commitments.push(commitment);
    }

    return {
        secrets, nullifiers, commitments, nullifierHashes
    }
}`: ""}

`
}

function addFixedMerkleTreeK(hashfunc, kFor) {
    if (hashfunc !== "mimc7" && hashfunc !== "mimcsponge") {
        return ""
    }

    switch (kFor) {
        case "type":
            return " * @param {string | bigint | number} key - The key used for the MiMC7 hashing algorithm"
        case "arg":
            return ", key"

        default:
            return ""
    }
}


function runFixedMerkleTreejs(hashfunc) {
    return `
import readline from "node:readline";
import { populateTree, generateMerkleTree, generateMerkleProof, getMerkleRootFromMerkleProof } from "./merkletree.js";
import fs from "fs";
import path from "path";
${addRunjsKey(hashfunc, "import")}

const privateDir = "./private";
const publicDir = "./public";

async function main() {
    const action = process.argv[2];

    const r1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })

    switch (action) {
        case "new":
            console.log("CREATING A NEW MERKLE TREE\\n")
            r1.question("Enter how many secrets would you like to generate:\\n", async answer => {
                const valid = !isNaN(parseInt(answer));
                if (!valid) {
                    console.error("Error: not a valid number");
                    r1.close();
                    return;
                }
                ${addRunjsKey(hashfunc, "initialize")}

                console.log("Generating secrets and hashing commitments. Please wait!")
                const { secrets, nullifiers, commitments, nullifierHashes } = await populateTree(answer${addRunjsKey(hashfunc, "arg")}).then((res) => {
                    console.log("Done")
                    return res;
                });

                console.log("Generating merkle tree from commitments!");
                const { tree, root } = await generateMerkleTree(commitments${addRunjsKey(hashfunc, "arg")}).then((res) => {
                    console.log(\`Done.Root is \${res.root} \`);
                    return res;
                });

                console.log("Serializing data.")
                const privateData = JSON.stringify({ secrets, nullifiers${addRunjsKey(hashfunc, "arg")} }, (_, v) => typeof v === "bigint" ? v.toString(10) : v);

                const publicData = JSON.stringify({ commitments, nullifierHashes, root, tree }, (_, v) => typeof v === "bigint" ? v.toString(10) : v);

                const privatePath = path.join(process.cwd(), privateDir, root.toString(10) + ".json");
                const publicPath = path.join(process.cwd(), publicDir, root.toString(10) + ".json");
                console.log("Writing to file.")

                if (!fs.existsSync(path.join(process.cwd(), privateDir))) {
                    fs.mkdirSync(path.join(process.cwd(), privateDir))
                }

                if (!fs.existsSync(path.join(process.cwd(), publicDir))) {
                    fs.mkdirSync(path.join(process.cwd(), publicDir))
                }

                fs.writeFileSync(privatePath, privateData)
                fs.writeFileSync(publicPath, publicData);

                console.log("Done")

                r1.close();
            })
            break;
        case "proof": {
            r1.question("Enter the merkle root:\\n", (root_answer) => {
                const publicPath = path.join(process.cwd(), publicDir, root_answer + ".json");
                if (!fs.existsSync(publicPath)) {
                    console.log("Merkle tree not found in public folder");
                    r1.close();
                    return;
                }

                const publicData = fs.readFileSync(publicPath);
                const deserializedPublicData = JSON.parse(publicData, (key, value) => {
                    if (typeof value === "string") {
                        return BigInt(value)
                    }

                    return value;
                });
                ${addRunjsKey(hashfunc, "privatePath")}
                const commitments = deserializedPublicData.commitments;
                const tree = deserializedPublicData.tree;
                ${addRunjsKey(hashfunc, "deserializePrivatePath")}
                r1.question("Enter the commitment to verify\\n", async commitment_answer => {
                    const index = findCommitmentByIndex(BigInt(commitment_answer), commitments);

                    if (index === -1) {
                        console.log("Commitment not found in tree")
                        r1.close();
                        return;
                    }
                    console.log("Computing merkle proof. Please wait!")
                    const merkleProof = await generateMerkleProof(BigInt(commitment_answer${addRunjsKey(hashfunc, "arg")}), commitments, tree);

                    console.log("Done! Merkle Proof:")

                    console.log(JSON.stringify({ merkleProof }, (_, v) => typeof v === "bigint" ? v.toString(10) : v));

                    r1.close();
                })
            })
            break;
        }

        case "verify": {
            r1.question("Enter the merkle root:\\n", root_answer => {
                const entered_root = BigInt(root_answer);
                ${addRunjsKey(hashfunc, "privatePath")}
                ${addRunjsKey(hashfunc, "deserializePrivatePath")}
                r1.question("Enter the merkle proof:\\n", async proof_answer => {
                    const deserializedProof = JSON.parse(proof_answer, (key, value) => {
                        if (key === "hash") {
                            return BigInt(value);
                        }
                        return value;
                    })
                    console.log("Verifying proof. Please wait!")
                    const reducedRoot = await getMerkleRootFromMerkleProof(deserializedProof.merkleProof${addRunjsKey(hashfunc, "arg")});
                    if (reducedRoot === entered_root) {
                        console.log("MERKLE PROOF VALID!")
                    } else {
                        console.log("INVALID PROOF!")
                    }
                    r1.close()
                })

            })
        }
            break;
        default:
            throw new Error("Unknown command")
    }
}

/**
 * Finds a commitment in the list of commitments
 * @param {BigInt} commitment_answer 
 * @param {Array<BigInt>} commitments 
 * @returns {number} - returns the index of the commitment or -1 if not found
 */

function findCommitmentByIndex(commitment_answer, commitments) {
    for (let i = 0; i < commitments.length; i++) {
        if (commitment_answer == commitments[i]) {
            return i;
        }
    }
    return -1;
}

main().catch(err => {
    console.error(err);
    process.exitCode = 1;
})`
}

function addRunjsKey(hashfunc, kFor) {
    if (hashfunc !== "mimc7" && hashfunc !== "mimcsponge") {
        return ""
    }

    switch (kFor) {
        case "import":
            return `import { rbigint } from "./index.js";`
        case "initialize":
            return "const key = rbigint()"
        case "arg":
            return ", key"
        case "privatePath":
            return `const privatePath = path.join(process.cwd(), privateDir, root_answer + ".json");
                if (!fs.existsSync(privatePath)) {
                    console.log("Missing private data for merkle root. Missing MiMC7 hash key")
                    r1.close();
                    return;
                }
            `
        case "deserializePrivatePath":
            return `const privateData = fs.readFileSync(privatePath);
                const deserializedPrivateData = JSON.parse(privateData, (key, value) => {
                    if (typeof value === "string") {
                        return BigInt(value);
                    }
                    return value;
                })

                const key = deserializedPrivateData.key;

                if (key === undefined) {
                    console.log("Missing private data for merkle root. Missing MiMC7 hash key")
                    r1.close();
                    return;
                }
`
        default:
            return ""
    }
}


function getFixedMerkleTreeTests(extraPublicInputs, hashfunc) {
    return `
import assert from "assert";
import { computeProof, verifyProof,rbigint } from "../lib/index";
import fs from "fs";
import { encodeForCircuit, generateMerkleProof, generateMerkleTree, getMerkleRootFromMerkleProof, populateTree } from "../lib/merkletree";
import { getInput } from "./input.js";

it("should create a merkle tree, verify a merkle proof and test the circuit", async function () {
    const {secret, nullifier,${addTestsK(hashfunc, "justk")}pathElements,pathIndices,root,commitmentHash,nullifierHash,${extraPublicInputs.join(",")}} = await getInput(); 
    const zkeyPath = fs.readFileSync("circuits/compiled/vk_meta.txt", "utf-8")
    const { proof, publicSignals } = await computeProof({
        secret,
        nullifier,${addTestsK(hashfunc, "justk")}
        pathElements,
        pathIndices,
        publicInputs: {
            root,
            commitmentHash,
            nullifierHash,
            ${extraPublicInputs.join(",")}
        },
        snarkArtifacts: {
            wasmFilePath: "circuits/compiled/circuit_js/circuit.wasm",
            zkeyFilePath: zkeyPath,
        }
    });

    const verificationKeyFile = fs.readFileSync("circuits/compiled/verification_key.json", "utf-8");
    const verificationKey = JSON.parse(verificationKeyFile);
    const result = await verifyProof({ verificationKey, proof, publicSignals })
    assert.equal(result, true)

    //Write the tested proof, publicSignals and verificationKey to a file. This will be used for generating tests for the cosmwasm verifier contracts.
    fs.writeFileSync("./circuits/compiled/test_proof.json", JSON.stringify({ proof, publicSignals, verificationKey }))
}, 50000)`
}

function addTestsK(hashfunc, kFor) {
    if (hashfunc !== "mimc7" && hashfunc !== "mimcsponge") {
        return ""
    }

    switch (kFor) {
        case "initialize":
            return "const key = 313; // just an example key for tests"
        case "arg":
            return `, key`
        case "proofArg":
            return "\n        k: key,";
        case "justk":
            return "k,"
        default:
            return "";
    }
}



module.exports = { getFixedMerkleTreeTemplate, runFixedMerkleTreejs, getFixedMerkleTreeTests, addTestsK }