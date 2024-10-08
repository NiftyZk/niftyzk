
function fixedMerkleTreeHashImports(hashfunc) {
    switch (hashfunc) {
        case "pedersen":
            return `include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
`
        case "poseidon":
            return "unimplemented"
        case "mimc7":
            return "unimplemented"
        case "mimcsponge":
            return "unimplemented"
        default:
            return ""

    }
}

function hashLeftRightTemplate(hashfunc) {
    switch (hashfunc) {
        case "pedersen":
            return `template HashLeftRight(){
  signal input left;
  signal input right;
  signal output hash;
  // Hashing Pedersen hashes require 32 bits else the operation can fail
  component pedersenHash = Pedersen(512);
  component leftBits = Num2Bits(256);
  component rightBits = Num2Bits(256);

  leftBits.in <== left;
  rightBits.in <== right;

  for(var i =0; i < 256; i++){
    pedersenHash.in[i] <== leftBits.out[i];
    pedersenHash.in[i + 256] <== rightBits.out[i];
  }

  hash <== pedersenHash.out[0];
}`

        case "poseidon":
            return "unimplemented"
        case "mimc7":
            return "unimplemented"
        case "mimcsponge":
            return "unimplemented"
        default:
            return ""

    }
}


function fixedMerkletreeTemplate(hashfunc) {
    return `pragma circom 2.0.0;

${fixedMerkleTreeHashImports(hashfunc)}

${hashLeftRightTemplate(hashfunc)}


// if s == 0 returns [in[0], in[1]]
// if s == 1 returns [in[1], in[0]]
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0;
    out[0] <== (in[1] - in[0])*s + in[0];
    out[1] <== (in[0] - in[1])*s + in[1];
}


// Verifies that a merkle proof is correct for given root and leaf
// pathIndices input in an array of 0/1 selectors telling whether 
// given pathElement is on the left or right side of the merkle path
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    signal levelHashes[levels];

   levelHashes[0] <== leaf;

    for (var i = 1; i < levels; i++) {
        selectors[i] = DualMux();
        hashers[i] = HashLeftRight();

        selectors[i].in[1] <== levelHashes[i - 1];
        selectors[i].in[0] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i].left <== selectors[i].out[0];
        hashers[i].right <== selectors[i].out[1];
        
        levelHashes[i] <== hashers[i].hash;
    }
    
    root === levelHashes[levels -1];
}`
}

module.exports = { fixedMerkletreeTemplate }