var assert = require('assert');
const { getVerifierCircuit, getExtraPublicInputs } = require("../lib/circom/template");


describe('Circom template generation', function () {
    describe('adding extra signal inputs', function () {
        it('should contain 2 extra inputs', function () {
            const extraInputNames = ["price", "amount"]

            const { signalInputDeclarations, hiddenSignals, tamperingCheckConstraints, publicInputParams } = getExtraPublicInputs(extraInputNames)
            assert.equal(signalInputDeclarations, "signal input price;\n    signal input amount;\n    ")
            assert.equal(hiddenSignals, "signal priceSquare;\n    signal amountSquare;\n    ")
            assert.equal(tamperingCheckConstraints, "priceSquare <== price * price;\n    amountSquare <== amount * amount;\n    ")
            assert.equal(publicInputParams, ",price,amount")
        });
        it('should contain no extra inputs', function () {
            const extraInputNames = []

            const { signalInputDeclarations, hiddenSignals, tamperingCheckConstraints, publicInputParams } = getExtraPublicInputs(extraInputNames)
            assert.equal(signalInputDeclarations, "")
            assert.equal(hiddenSignals, "")
            assert.equal(tamperingCheckConstraints, "")
            assert.equal(publicInputParams, "")
        });

        it("Should generate the verifier circuit from template", function () {
            const expectedResult = `pragma circom 2.0.0;
include "./utils/commitment_hasher.circom";
include "./utils/merkle_tree.circom";

template VerifyNote(levels){
    // Public inputs
    signal input nullifierHash;
    signal input commitmentHash;
    signal input recipient;
    signal input root; // The tree's root hash
    signal input price;
    signal input amount;
    

    // private inputs
    signal input nullifier;
    signal input secret;
    signal input pathElements[levels]; // The merkle proof which is fixed size, pathElements contains the hashes
    signal input pathIndices[levels]; // Indices encode if we hash left or right

    // Hidden signals to validate inputs so they can't be tampared with
    signal recipientSquare;
    signal priceSquare;
    signal amountSquare;
    

    component commitmentHasher = CommitmentHasher();

    commitmentHasher.nullifier <== nullifier;
    commitmentHasher.secret <== secret;

    // Check if the nullifierHash and commitment are valid
    commitmentHasher.nullifierHash === nullifierHash;
    commitmentHasher.commitment === commitmentHash;

    // An extra operation with the public signal to avoid tampering 

    recipientSquare <== recipient * recipient;
    priceSquare <== price * price;
    amountSquare <== amount * amount;
        
    // Check if the merkle root contains the commitmentHash!
    component tree = MerkleTreeChecker(levels);

    tree.leaf <== commitmentHasher.commitment;
    tree.root <== root;

    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== pathElements[i];
        tree.pathIndices[i] <== pathIndices[i];
    }

}

component main {public [nullifierHash,commitmentHash,recipient,root,price,amount]} = VerifyNote(20);
`
            const extraInputNames = ["price", "amount"]

            const verifierCircuit = getVerifierCircuit(extraInputNames)

            assert.equal(verifierCircuit, expectedResult)
        })
    });
});