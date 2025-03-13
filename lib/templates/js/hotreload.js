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

    if (scheme === "smt-eddsa-inc/exc" || scheme === "smt-eddsa-ins/upd/del") {
        return `
import { newMemEmptyTrie } from "circomlibjs";
import { initializeTree } from "../lib/smt.js";
import { computeMessageHash, generateAccount, getAddressFromPubkey, getEDDSA, getSignatureParameters, rbigint, stringToBigint, signMessage, buildHashImplementation } from "../lib/index.js";
import assert from "assert";

/**
 * This is a test input, generated for the starting circuit.
 * If you update the inputs, you need to update this function to match it.
 */
export async function getInput(){
    ${eddsaInputsForSMTs(hashfunc, merkletree, extraPublicInputs, scheme)}
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
        message,
        ${addTestsK(hashfunc, "proofArg")}
        ${extraPublicInputs.join(",\n        ")}
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
        ${extraPublicInputs.join(",\n        ")}
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


function eddsaInputsForSMTs(hashfunc, merkletree, extraPublicInputs, scheme) {
    let initializeExtraInputs = [];
    let messageInputs = [];
    for (let i = 0; i < extraPublicInputs.length; i++) {
        initializeExtraInputs.push(`    const ${extraPublicInputs[i]} = rbigint()`)
        messageInputs.push(extraPublicInputs[i]);
    }

    if (scheme === "smt-eddsa-inc/exc") {

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

    const accountAddress = await getAddressFromPubkey(account.pubKey);

    const tree = await newMemEmptyTrie();

    const inclusion = true; // Set to false for exclusion test

     if (INCLUSION) {
        const _key = tree.F.e(accountAddress);
        const exampleTreeContent = [{ key: _key, value: messageHash }]
        await initializeTree(exampleTreeContent, tree);

        const foundKey = await tree.find(_key);
        assert(foundKey.found);

        //Get the siblings of the key and pad the tree to have enough levels
        let siblings = foundKey.siblings;
        for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
        //The tree is padded with zeroes!
        while (siblings.length < 10) siblings.push(0);

        //The key parameter is computed internally in the circuit using the Ax,Ay from the signature!
        return {
            Ax: signatureParameters.Ax,
            Ay: signatureParameters.Ay,
            S: signatureParameters.S,
            R8x: signatureParameters.R8x,
            R8y: signatureParameters.R8y,
            root: tree.F.toObject(tree.root),
            siblings,
            fnc: 0,
            oldValue: 0,
            oldKey: 0,
            isOld0: 0,
            value: tree.F.toObject(foundKey.foundValue),
            message,
            ${extraPublicInputs.join(",\n        ")}
        }
    } else {
        const exampleAccount = generateAccount(eddsa);
        const exampleAddress = await getAddressFromPubkey(exampleAccount.pubKey);
        const exampleTreeContent = [{ key: tree.F.e(exampleAddress), value: 0n }];
        //The tree is initialized with empty content, the signer's key is excluded
        await initializeTree(exampleTreeContent, tree);
        const foundKey = await tree.find(tree.F.e(1n)) // A key that doesn't exist in the exampleTreeContent
        assert(!foundKey.found);
        let siblings = foundKey.siblings;
        for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
        while (siblings.length < 10) siblings.push(0);

        return {
            Ax: signatureParameters.Ax,
            Ay: signatureParameters.Ay,
            S: signatureParameters.S,
            R8x: signatureParameters.R8x,
            R8y: signatureParameters.R8y,
            root: tree.F.toObject(tree.root),
            siblings,
            fnc: 1, // Exclusion
            oldKey: foundKey.isOld0 ? 0 : tree.F.toObject(foundKey.notFoundKey),
            oldValue: foundKey.isOld0 ? 0 : tree.F.toObject(foundKey.notFoundValue),
            isOld0: foundKey.isOld0 ? 1 : 0,
            value: messageHash,
            message,
            ${extraPublicInputs.join(",\n        ")}
        }

    }
`

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
    
     const accountAddress = await getAddressFromPubkey(account.pubKey);

    const tree = await newMemEmptyTrie();

    const INCLUSION = true; // Set to false for exclusion test

     if (INCLUSION) {
        const _key = tree.F.e(accountAddress);
        const exampleTreeContent = [{ key: _key, value: messageHash }]
        await initializeTree(exampleTreeContent, tree);

        const foundKey = await tree.find(_key);
        assert(foundKey.found);

        //Get the siblings of the key and pad the tree to have enough levels
        let siblings = foundKey.siblings;
        for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
        //The tree is padded with zeroes!
        while (siblings.length < 10) siblings.push(0);

        //The key parameter is computed internally in the circuit using the Ax,Ay from the signature!
        return {
            Ax: signatureParameters.Ax,
            Ay: signatureParameters.Ay,
            S: signatureParameters.S,
            R8x: signatureParameters.R8x,
            R8y: signatureParameters.R8y,
            root: tree.F.toObject(tree.root),
            ${addTestsK(hashfunc, "proofArg")}
            siblings,
            fnc: 0,
            oldValue: 0,
            oldKey: 0,
            isOld0: 0,
            value: tree.F.toObject(foundKey.foundValue),
            message,
            ${extraPublicInputs.join(",\n        ")}
        }
    } else {
        const exampleAccount = generateAccount(eddsa);
        const exampleAddress = await getAddressFromPubkey(exampleAccount.pubKey);
        const exampleTreeContent = [{ key: tree.F.e(exampleAddress), value: 0n }];
        //The tree is initialized with empty content, the signer's key is excluded
        await initializeTree(exampleTreeContent, tree);
        const foundKey = await tree.find(tree.F.e(1n)) // A key that doesn't exist in the exampleTreeContent
        assert(!foundKey.found);
        let siblings = foundKey.siblings;
        for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
        while (siblings.length < 10) siblings.push(0);

        return {
            Ax: signatureParameters.Ax,
            Ay: signatureParameters.Ay,
            S: signatureParameters.S,
            R8x: signatureParameters.R8x,
            R8y: signatureParameters.R8y,
            root: tree.F.toObject(tree.root),
            ${addTestsK(hashfunc, "proofArg")}
            siblings,
            fnc: 1, // Exclusion
            oldKey: foundKey.isOld0 ? 0 : tree.F.toObject(foundKey.notFoundKey),
            oldValue: foundKey.isOld0 ? 0 : tree.F.toObject(foundKey.notFoundValue),
            isOld0: foundKey.isOld0 ? 1 : 0,
            value: messageHash,
            message,
            ${extraPublicInputs.join(",\n        ")}
        }
    }`
        }


    } else if (scheme === "smt-eddsa-ins/upd/del") {
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

    const accountAddress = await getAddressFromPubkey(account.pubKey);

    const tree = await newMemEmptyTrie();

    //Set this to test insert/update/delete
    const ACTION = "delete"

    const _key = tree.F.e(accountAddress);
    const value = tree.F.e(message);

    const exampleTree = [{ key: 111n, value: 222n }, { key: 333n, value: 444n }];

    await initializeTree(exampleTree, tree)


    const insertFNC = [1, 0];
    const updateFNC = [0, 1];
    const deleteFNC = [1, 1];

    switch (ACTION) {
        case "insert": {
            const { serializableLeaves, updateResult } = await mutateTree("insert", _key, value, exampleTree, tree);
            let siblings = updateResult.siblings;
            for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
            while (siblings.length < 10) siblings.push(0);

            return {
                Ax: signatureParameters.Ax,
                Ay: signatureParameters.Ay,
                S: signatureParameters.S,
                R8x: signatureParameters.R8x,
                R8y: signatureParameters.R8y,
                fnc: insertFNC,
                oldRoot: tree.F.toObject(updateResult.oldRoot),
                siblings,
                oldKey: updateResult.isOld0 ? 0 : tree.F.toObject(updateResult.oldKey),
                oldValue: updateResult.isOld0 ? 0 : tree.F.toObject(updateResult.oldValue),
                isOld0: updateResult.isOld0 ? 1 : 0,
                newKey: tree.F.toObject(_key),
                newValue: tree.F.toObject(value),
                ${extraPublicInputs.join(",\n        ")}

            }

        }
        case "update": {
            const inserted = await mutateTree("insert", _key, value, exampleTree, tree);

            const { serializableLeaves, updateResult } = await mutateTree("update", _key, value, inserted.serializableLeaves, tree)

            let siblings = updateResult.siblings;
            for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
            while (siblings.length < 10) siblings.push(0);

            return {
                Ax: signatureParameters.Ax,
                Ay: signatureParameters.Ay,
                S: signatureParameters.S,
                R8x: signatureParameters.R8x,
                R8y: signatureParameters.R8y,
                fnc: updateFNC,
                oldRoot: tree.F.toObject(updateResult.oldRoot),
                siblings,
                oldKey: tree.F.toObject(updateResult.oldKey),
                oldValue: tree.F.toObject(updateResult.oldValue),
                isOld0: 0,
                newKey: tree.F.toObject(updateResult.newKey),
                newValue: tree.F.toObject(updateResult.newValue),
                ${extraPublicInputs.join(",\n        ")}

            }
        }
        case "delete": {
            const inserted = await mutateTree("insert", _key, value, exampleTree, tree);

            const { serializableLeaves, updateResult } = await mutateTree("delete", _key, value, inserted.serializableLeaves, tree)

            let siblings = updateResult.siblings;
            for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
            while (siblings.length < 10) siblings.push(0);
            return {
                Ax: signatureParameters.Ax,
                Ay: signatureParameters.Ay,
                S: signatureParameters.S,
                R8x: signatureParameters.R8x,
                R8y: signatureParameters.R8y,
                fnc: deleteFNC,
                oldRoot: tree.F.toObject(updateResult.oldRoot),
                siblings,
                oldKey: tree.F.toObject(updateResult.oldKey),
                oldValue: tree.F.toObject(updateResult.oldValue),
                isOld0: updateResult.isOld0 ? 1 : 0,
                newKey: tree.F.toObject(updateResult.delKey),
                newValue: tree.F.toObject(updateResult.delValue),
                ${extraPublicInputs.join(",\n        ")}
            }
        }
        default:
            break;
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
    
   const accountAddress = await getAddressFromPubkey(account.pubKey);

    const tree = await newMemEmptyTrie();

    //Set this to test insert/update/delete
    const ACTION = "delete"

    const _key = tree.F.e(accountAddress);
    const value = tree.F.e(message);

    const exampleTree = [{ key: 111n, value: 222n }, { key: 333n, value: 444n }];

    await initializeTree(exampleTree, tree)


    const insertFNC = [1, 0];
    const updateFNC = [0, 1];
    const deleteFNC = [1, 1];

    switch (ACTION) {
        case "insert": {
            const { serializableLeaves, updateResult } = await mutateTree("insert", _key, value, exampleTree, tree);
            let siblings = updateResult.siblings;
            for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
            while (siblings.length < 10) siblings.push(0);

            return {
                Ax: signatureParameters.Ax,
                Ay: signatureParameters.Ay,
                S: signatureParameters.S,
                R8x: signatureParameters.R8x,
                R8y: signatureParameters.R8y,
                ${addTestsK(hashfunc, "proofArg")} 
                fnc: insertFNC,
                oldRoot: tree.F.toObject(updateResult.oldRoot),
                siblings,
                oldKey: updateResult.isOld0 ? 0 : tree.F.toObject(updateResult.oldKey),
                oldValue: updateResult.isOld0 ? 0 : tree.F.toObject(updateResult.oldValue),
                isOld0: updateResult.isOld0 ? 1 : 0,
                newKey: tree.F.toObject(_key),
                newValue: tree.F.toObject(value),
                ${extraPublicInputs.join(",\n        ")}


            }

        }
        case "update": {
            const inserted = await mutateTree("insert", _key, value, exampleTree, tree);

            const { serializableLeaves, updateResult } = await mutateTree("update", _key, value, inserted.serializableLeaves, tree)

            let siblings = updateResult.siblings;
            for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
            while (siblings.length < 10) siblings.push(0);

            return {
                Ax: signatureParameters.Ax,
                Ay: signatureParameters.Ay,
                S: signatureParameters.S,
                R8x: signatureParameters.R8x,
                R8y: signatureParameters.R8y,
                ${addTestsK(hashfunc, "proofArg")}
                fnc: updateFNC,
                oldRoot: tree.F.toObject(updateResult.oldRoot),
                siblings,
                oldKey: tree.F.toObject(updateResult.oldKey),
                oldValue: tree.F.toObject(updateResult.oldValue),
                isOld0: 0,
                newKey: tree.F.toObject(updateResult.newKey),
                newValue: tree.F.toObject(updateResult.newValue),
                ${extraPublicInputs.join(",\n        ")}

            }
        }
        case "delete": {
            const inserted = await mutateTree("insert", _key, value, exampleTree, tree);

            const { serializableLeaves, updateResult } = await mutateTree("delete", _key, value, inserted.serializableLeaves, tree)

            let siblings = updateResult.siblings;
            for (let i = 0; i < siblings.length; i++) siblings[i] = tree.F.toObject(siblings[i]);
            while (siblings.length < 10) siblings.push(0);
            return {
                Ax: signatureParameters.Ax,
                Ay: signatureParameters.Ay,
                S: signatureParameters.S,
                R8x: signatureParameters.R8x,
                R8y: signatureParameters.R8y,
                ${addTestsK(hashfunc, "proofArg")} 
                fnc: deleteFNC,
                oldRoot: tree.F.toObject(updateResult.oldRoot),
                siblings,
                oldKey: tree.F.toObject(updateResult.oldKey),
                oldValue: tree.F.toObject(updateResult.oldValue),
                isOld0: updateResult.isOld0 ? 1 : 0,
                newKey: tree.F.toObject(updateResult.delKey),
                newValue: tree.F.toObject(updateResult.delValue),
                ${extraPublicInputs.join(",\n        ")}
            }
        }
        default:
            break;
    }
`
        }

    }

    return ``
}
