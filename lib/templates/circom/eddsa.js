//Eddsa circuit with or without merkle tree
const version = `pragma circom 2.0.0;\n`

function eddsaImport(hashfunc, merkletree) {
    const merkleTreeImport = merkletree === "fixed" ? `include "./merkletree.circom";` : ""

    switch (hashfunc) {
        case "mimc7":
            return `include "../node_modules/circomlib/circuits/eddsamimc.circom";
include "../node_modules/circomlib/circuits/mimc.circom";
${merkleTreeImport}
`
        case "mimcsponge":
            return `include "../node_modules/circomlib/circuits/eddsamimcsponge.circom";
include "../node_modules/circomlib/circuits/mimcsponge.circom";
${merkleTreeImport}
`

        case "poseidon":
            return `include "../node_modules/circomlib/circuits/eddsaposeidon.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
${merkleTreeImport}
`
        case "pedersen":
            return `include "../node_modules/circomlib/circuits/eddsa.circom";
include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
${merkleTreeImport}
`
        default:
            return ``
    }
}

function templateStart(merkletree) {
    return `template VerifySignature(${merkletree === "fixed" ? "levels" : ""}){\n`
}

function signedMessages(publicInputsArr) {
    let signals = [];

    for (let i = 0; i < publicInputsArr.length; i++) {
        signals.push(`    signal input ${publicInputsArr[i]};`)
    }

    return `signal input message;\n${signals.join("\n")}`
}

function hasRoot(merkletree, renderFor) {
    if (merkletree === "fixed") {
        if (renderFor === "signal_declaration") {
            return "signal input root;\n"
        }

        if (renderFor === "path_indices_signals") {
            return `signal input pathIndices[levels];\n    signal input pathElements[levels];\n`
        }

    }
    return ""
}

function hasK(hashfunc) {
    if (hashfunc === "mimc7" || hashfunc === "mimcsponge") {
        return `signal input k;\n`
    }
    return ``
}

function signatureParameters(hashfunc) {
    switch (hashfunc) {
        case "mimc7":

            return `
    signal input Ax;
    signal input Ay;
    signal input S;
    signal input R8x;
    signal input R8y;
`
        case "mimcsponge":
            return `
    //The parameters for the signature
    //The Ax and Ay parameters are the public key, Ax = pubKey[0], Ay = pubKey[1]
    signal input Ax;
    signal input Ay;
    signal input S;
    signal input R8x;
    signal input R8y;`
        case "pedersen":
            return `
    //The parameters for the signature 
    signal input A[256];
    signal input R8[256];
    signal input S[256];`
        case "poseidon":
            return `
    //The parameters for the signature
    //The Ax and Ay parameters are the public key, Ax = pubKey[0], Ay = pubKey[1]
    signal input Ax;
    signal input Ay;
    signal input S;
    signal input R8x;
    signal input R8y;`
        default:
            break;
    }
}

function eddsaComponent(hashfunc) {
    switch (hashfunc) {
        case "mimc7":
            return `component eddsa = EdDSAMiMCVerifier();\n`
        case "mimcsponge":
            return `component eddsa = EdDSAMiMCSpongeVerifier();\n`
        case "poseidon":
            return `component eddsa = EdDSAPoseidonVerifier();\n`
        case "pedersen":
            return `component eddsa = EdDSAVerifier(256);\n`
        default:
            return ""
    }
}

function messageHasher(hashfunc, publicInputsArr) {
    switch (hashfunc) {
        case "mimc7": {
            let inputs = [];
            for (let i = 0; i < publicInputsArr.length; i++) {
                inputs.push(`    mimc7Hash.in[${i + 1}] <== ${publicInputsArr[i]};`)
            }

            return `
    component mimc7Hash = MultiMiMC7(${1 + publicInputsArr.length}, 91);
    mimc7Hash.k <== k;
    mimc7Hash.in[0] <== message;
    ${inputs.join("\n    ")}
`
        }
        case "mimcsponge": {
            let inputs = [];
            for (let i = 0; i < publicInputsArr.length; i++) {
                inputs.push(`    mimcSpongeHash.ins[${i}+1] <== ${publicInputsArr[i]};`)
            }
            return `
    component mimcSpongeHash = MiMCSponge(${1 + publicInputsArr.length}, 220,1);
    mimcSpongeHash.k <== k;
    mimcSpongeHash.ins[0] <== message;
    ${inputs.join("\n")}
    `}
        case "pedersen": {

            let inputs = [];

            for (let i = 0; i < publicInputsArr.length; i++) {
                inputs.push(`    messageHasher.${publicInputsArr[i]} <== ${publicInputsArr[i]};`)
            }
            return `
    component messageHasher  = MessageHasher();
    messageHasher.message <== message;
${inputs.join("\n")}
    `};
        case "poseidon": {

            let inputs = [];
            for (let i = 0; i < publicInputsArr.length; i++) {
                inputs.push(`    poseidon.inputs[${i + 1}] <== ${publicInputsArr[i]};`)
            }

            return `
    component poseidon = Poseidon(${1 + publicInputsArr.length});
    poseidon.inputs[0] <== message;
${inputs.join("\n")}`;
        }
        default:
            break;
    }
}

function verifyMessage(hashfunc) {
    switch (hashfunc) {
        case "mimc7":

            return `
    eddsa.enabled <== 1;
    eddsa.Ax <== Ax;
    eddsa.Ay <== Ay;
    eddsa.S <== S;
    eddsa.R8x <== R8x;
    eddsa.R8y <== R8y;
    eddsa.M <== mimc7Hash.out;`
        case "mimcsponge":
            return `
    eddsa.enabled <== 1;
    eddsa.Ax <== Ax;
    eddsa.Ay <== Ay;
    eddsa.S <== S;
    eddsa.R8x <== R8x;
    eddsa.R8y <== R8y;
    eddsa.M <== mimcSpongeHash.outs[0];`
        case "pedersen":
            return `
    for(var i = 0;i < 256;i++){
        eddsa.A[i] <== A[i];
        eddsa.S[i] <== S[i];
        eddsa.R8[i] <== R8[i];
        eddsa.msg[i] <== messageHasher.out[i];
   }   
            `;
        case "poseidon":
            return `
    // Verify the signature on the message hash
    
    eddsa.enabled <== 1;
    eddsa.Ax <== Ax;
    eddsa.Ay <== Ay;
    eddsa.S <== S;
    eddsa.R8x <== R8x;
    eddsa.R8y <== R8y;
    eddsa.M <== poseidon.out;`
        default:
            return ``
    }
}

function pedersenHasher(hashfunc, publicInputsArr) {
    if (hashfunc === "pedersen") {
        let messageCount = 1 + publicInputsArr.length;
        let pedersen_bitsize = messageCount * 248;
        let inputs = [];
        let num2Bits = [];
        let hash = [];
        for (let i = 0; i < publicInputsArr.length; i++) {
            inputs.push(`  signal input ${publicInputsArr[i]};`)
            num2Bits.push(`  component ${publicInputsArr[i]}Bits = Num2Bits(248);\n  ${publicInputsArr[i]}Bits.in <== ${publicInputsArr[i]};`)
            hash.push(`hasher.in[i +${248 * (i + 1)}] <== ${publicInputsArr[i]}Bits.out[i];`)
        }

        return `
template MessageHasher(){
  signal input message; //31 byte messages are 248 bits
${inputs.join("\n")}
  signal output out[256];

  component messageBits = Num2Bits(248);
  messageBits.in <== message;
${num2Bits.join("\n")}
  component hasher = Pedersen(${pedersen_bitsize});

  for(var i = 0; i < 248; i++){
    hasher.in[i] <== messageBits.out[i];
    ${hash.join("\n")}
  }

  component outBits = Num2Bits(256);
  outBits.in <== hasher.out[0];

  for(var i = 0; i < 256; i++){
    out[i] <== outBits.out[i];
  }

}
`
    }
    return ``;
}

function entry(publicInputsArr, merkletree) {
    const hasInputs = publicInputsArr.length !== 0;
    return `}
    
component main {public [message${hasInputs ? "," : ""}${publicInputsArr.join(",")}${merkletree === "fixed" ? ",root" : ""}]}  = VerifySignature(${merkletree === "fixed" ? 20 : ""}); `
}

function merkleTreeChecker(hashfunc, merkletree) {
    if (merkletree === "fixed") {

        switch (hashfunc) {
            case "mimc7":
                return `
    //We compute a public key by hashing Ax and Ay, 
   // this will be later used with the merkle tree
   component pubKeyHasher = MultiMiMC7(2, 91);
pubKeyHasher.in[0] <== Ax;
pubKeyHasher.in[1] <== Ay;
pubKeyHasher.k <== k;

   //Verify the merkle tree
   component tree = MerkleTreeChecker(levels);

for (var i = 0; i < levels; i++) {
    tree.pathElements[i] <== pathElements[i];
    tree.pathIndices[i] <== pathIndices[i];
}
tree.k <== k;
tree.root <== root;
tree.leaf <== pubKeyHasher.out; `
            case "mimcsponge":
                return `
   //We compute a public key by hashing Ax and Ay, 
   // this will be later used with the merkle tree
   component pubKeyHasher = MiMCSponge(2, 220, 1);
pubKeyHasher.ins[0] <== Ax;
pubKeyHasher.ins[1] <== Ay;
pubKeyHasher.k <== k;

   //Verify the merkle tree
   component tree = MerkleTreeChecker(levels);

for (var i = 0; i < levels; i++) {
    tree.pathElements[i] <== pathElements[i];
    tree.pathIndices[i] <== pathIndices[i];
}
tree.k <== k;
tree.root <== root;
tree.leaf <== pubKeyHasher.outs[0]; `
            case "poseidon":
                return `
    //We compute a public key by hashing Ax and Ay, 
   // this will be later used with the merkle tree
   component pubKeyHasher = Poseidon(2);
pubKeyHasher.inputs[0] <== Ax;
pubKeyHasher.inputs[1] <== Ay;

   //Verify the merkle tree
   component tree = MerkleTreeChecker(levels);


for (var i = 0; i < levels; i++) {
    tree.pathElements[i] <== pathElements[i];
    tree.pathIndices[i] <== pathIndices[i];
}
tree.root <== root;
tree.leaf <== pubKeyHasher.out; `
            case "pedersen":
                return `
    //Hash the A public key to create an "address" that is used inside the merkle tree
    component pubKeyHasher = Pedersen(256);

for (var i = 0; i < 256; i++) {
    pubKeyHasher.in[i] <== A[i];
}
     // Check if the merkle root contains the address derived from pub key
    component tree = MerkleTreeChecker(levels);

tree.leaf <== pubKeyHasher.out[0];
tree.root <== root;

for (var i = 0; i < levels; i++) {
    tree.pathElements[i] <== pathElements[i];
    tree.pathIndices[i] <== pathIndices[i];
}

`
            default:
                return "";
        }


    }

    return ``
}


function getEddsaCircuit(publicInputsArr, hashfunc, merkletree) {

    return `${version}
${eddsaImport(hashfunc, merkletree)}
${pedersenHasher(hashfunc, publicInputsArr)}
${templateStart(merkletree)}
    ${signedMessages(publicInputsArr)}
    ${hasRoot(merkletree, "signal_declaration")}
    ${hasK(hashfunc)}
    ${hasRoot(merkletree, "path_indices_signals")}
    ${signatureParameters(hashfunc)}
    ${eddsaComponent(hashfunc)}
    ${messageHasher(hashfunc, publicInputsArr)}
    ${verifyMessage(hashfunc)}
    ${merkleTreeChecker(hashfunc, merkletree)}
    ${entry(publicInputsArr, merkletree)}
`;
}


module.exports = { getEddsaCircuit }