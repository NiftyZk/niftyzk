//Returns the smt.js file
function getSMTjs() {
    return `
//This contains helper functions to use circomlibjs SMT
//The db inside the SMT is hard to serialize so helper functions
// are used to make state changes in the tree

import { SMT } from "circomlibjs";

/**
 * The leaves when deserialized are a list of BigInt keys and values
 * @typedef {Object} Leaves
 * @property {BigInt} key -- The keys for the merkel tree leaf
 * @property {BigInt} value -- The value in the merkle tree leaf
 */


/**
 * Deserialize the leaves from a string
 * @param {string} leaves 
 * @returns {Array<Leaves>}
 */

export function deserializeLeaves(leaves) {
    return JSON.parse(leaves, function (_, value) {
        if (typeof value === "string") {
            return BigInt(value)
        }
        return value
    })
}

/**
 * Serialize leaves to string
 * @param {Array<Leaves>} leaves - The leaves are a list of {key: bigint, value: bigint}
 * @returns {String} - The serialized leaves
 */

export function serializeLeaves(leaves) {
    return JSON.stringify(leaves, function (_, value) {
        if (typeof value === "bigint") {
            return value.toString();
        }
        return value;
    })
}

/**
 * Initialize the tree using the leaves, it runs smt.insert in a loop
 * @param {Array<Leaves>} leaves 
 * @param {SMT} emptyTree 
 */

export async function initializeTree(leaves, emptyTree) {
    for (let i = 0; i < leaves.length; i++) {
        await emptyTree.insert(emptyTree.F.e(leaves[i].key), emptyTree.F.e(leaves[i].value));
    }
}

/**
 * Finds the leaf by key. used internally by MutateTree, Throws error if key is not found
 * @param {Array<Leaves>} serializableLeaves 
 * @param {BigInt} key 
 * @returns {number} returns the index of the leaf
 */

function findLeafByKey(serializableLeaves, key) {
    let index = null;
    for (let i = 0; i < serializableLeaves.length; i++) {
        if (serializableLeaves[i].key === key) {
            index = i;
        };
    }

    if (index === null) {
        throw new Error("Key not found in serializable leaves")
    }

    return index;
}

/**
 * Mutates the SMT and the serializableLeaves at the same time.
 * The reason this function exists is because the SMT db is hard to serialize, so the serialized leaves are mutated parallel to it separately, that makes it easy to save the tree and load it.
 * @param {"insert" | "delete" | "update" } action - Specifies what to do with the merkle tree. Update it , delete a key or insert a new value
 * @param {BigInt} key - The key of the entry to mutate
 * @param {BigInt} value - The value of the entry to mutate
 * @param {Array<Leaves>} serializableLeaves - The leaves that will be mutated
 * @param {SMT} smt - The SMT that will be mutated
 * @returns {Array<Leaves>} - Returns the mutate serializable leaves
 */

export async function mutateTree(action, key, value, serializableLeaves, smt) {
    if (action === "insert") {

        await smt.insert(smt.F.e(key), smt.F.e(value))

        serializableLeaves.push({ key, value })

        return serializableLeaves

    } else if (action === "delete") {

        await smt.delete(smt.F.e(key));
        let index = findLeafByKey(serializableLeaves, key)
        serializableLeaves.splice(index, 1);
        return serializableLeaves

    } else if (action === "update") {

        await smt.update(smt.F.e(key), smt.F.e(value));

        let index = findLeafByKey(serializableLeaves, key)

        serializableLeaves.splice(index, 1, { key, value })

        return serializableLeaves
    }

    throw new Error("Invalid mutate action")

}`
}


function SMTTestjs() {
    return `
import assert from "assert";
import { newMemEmptyTrie } from "circomlibjs";
import { deserializeLeaves, initializeTree, mutateTree, serializeLeaves } from "../lib/smt";

function exampleTree() {
    return [{ key: 111n, value: 222n }, { key: 333n, value: 444n }];
}
//This test is added so you can learn how the SMT serialization works.
//The once you update an SMT object, it's hard to extract a serializable tree from it
//So the solution here was to keep a list of leaves and update them parallel the SMT in-memory tree
it("SMT serialized leaves, insert, update, delete", async function () {
    const serialized = serializeLeaves(exampleTree());

    let leaves = deserializeLeaves(serialized)

    let tree = await newMemEmptyTrie();

    await initializeTree(leaves, tree);

    //Insert
    const newEntry = { key: 999n, value: 23n }

    leaves = await mutateTree("insert", newEntry.key, newEntry.value, leaves, tree);

    let secondTree = await newMemEmptyTrie();

    await initializeTree(leaves, secondTree);

    assert(tree.F.toObject(tree.root) === secondTree.F.toObject(secondTree.root), true)

    //Update
    const updateEntry = { key: 999n, value: 23n }

    leaves = await mutateTree("update", updateEntry.key, updateEntry.value, leaves, tree);

    let thirdTree = await newMemEmptyTrie();
    await initializeTree(leaves, thirdTree);

    assert(tree.F.toObject(tree.root) === thirdTree.F.toObject(thirdTree.root), true);

    //delete 
    const deleteEntry = { key: 111n, value: 222n }
    leaves = await mutateTree("delete", deleteEntry.key, deleteEntry.value, leaves, tree)

    let fourthTree = await newMemEmptyTrie();
    await initializeTree(leaves, fourthTree);

    assert(tree.F.toObject(tree.root) === fourthTree.F.toObject(fourthTree.root), true);

})`
}

module.exports = { getSMTjs, SMTTestjs }