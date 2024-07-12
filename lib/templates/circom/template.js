const { extraPublicInputs } = require("./utils")

function getVerifierCircuit(extraPublicInputs) {
    const { signalInputDeclarations, hiddenSignals, tamperingCheckConstraints, publicInputParams } = getExtraPublicInputs(extraPublicInputs)

    return `pragma circom 2.0.0;
include "./utils/commitment_hasher.circom";
include "./utils/merkle_tree.circom";

template VerifyNote(levels){
    // Public inputs
    signal input nullifierHash;
    signal input commitmentHash;
    signal input recipient;
    signal input root; // The tree's root hash
    ${signalInputDeclarations}

    // private inputs
    signal input nullifier;
    signal input secret;
    signal input pathElements[levels]; // The merkle proof which is fixed size, pathElements contains the hashes
    signal input pathIndices[levels]; // Indices encode if we hash left or right

    // Hidden signals to validate inputs so they can't be tampared with
    signal recipientSquare;
    ${hiddenSignals}

    component commitmentHasher = CommitmentHasher();

    commitmentHasher.nullifier <== nullifier;
    commitmentHasher.secret <== secret;

    // Check if the nullifierHash and commitment are valid
    commitmentHasher.nullifierHash === nullifierHash;
    commitmentHasher.commitment === commitmentHash;

    // An extra operation with the public signal to avoid tampering 

    recipientSquare <== recipient * recipient;
    ${tamperingCheckConstraints}    
    // Check if the merkle root contains the commitmentHash!
    component tree = MerkleTreeChecker(levels);

    tree.leaf <== commitmentHasher.commitment;
    tree.root <== root;

    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

}

component main {public [nullifierHash,commitmentHash,recipient,root${publicInputParams}]} = VerifyNote(20);
`
}

module.exports = { getVerifierCircuit };

