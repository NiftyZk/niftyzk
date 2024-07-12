pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";

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
}