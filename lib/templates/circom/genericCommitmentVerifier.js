const { getExtraPublicInputs } = require("./utils")

function getPoseidonCommitmentHasher() {
    return `pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template CommitmentHasher(){
    signal input nullifier;
    signal input secret;
    signal output commitment;
    signal output nullifierHash;

    component commitmentPoseidon = Poseidon(2);

    commitmentPoseidon.inputs[0] <== nullifier;
    commitmentPoseidon.inputs[1] <== secret;

    commitment <== commitmentPoseidon.out;

    component nullifierPoseidon = Poseidon(1);

    nullifierPoseidon.inputs[0] <== nullifier;

    nullifierHash <== nullifierPoseidon.out;
}`
}


function getGenericCircuit(extraPublicInputs) {
    const { signalInputDeclarations, hiddenSignals, tamperingCheckConstraints, publicInputParams } = getExtraPublicInputs(extraPublicInputs)

    return `pragma circom 2.0.0;
include "./commitment_hasher.circom";

template CommitmentRevealScheme(){
    // Public inputs
    signal input nullifierHash;
    signal input commitmentHash;
    ${signalInputDeclarations}

    // private inputs
    signal input nullifier;
    signal input secret;

    // Hidden signals to validate inputs so they can't be tampared with
    ${hiddenSignals}

    component commitmentHasher = CommitmentHasher();

    commitmentHasher.nullifier <== nullifier;
    commitmentHasher.secret <== secret;

    // Check if the nullifierHash and commitment are valid
    commitmentHasher.nullifierHash === nullifierHash;
    commitmentHasher.commitment === commitmentHash;

    // An extra operation with the public signal to avoid tampering 

    ${tamperingCheckConstraints}    

}

component main {public [nullifierHash,commitmentHash${publicInputParams}]} = CommitmentRevealScheme();
`
}

module.exports = { getPoseidonCommitmentHasher, getGenericCircuit }