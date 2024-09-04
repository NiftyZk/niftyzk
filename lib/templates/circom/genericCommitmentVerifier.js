const { getExtraPublicInputs } = require("./utils")

function getCommitmentHasher(hashfunc) {
    return `pragma circom 2.0.0;
    
${getHashFuncImport(hashfunc)}

template CommitmentHasher(){
    signal input nullifier;
    signal input secret;
    ${hasKInput(hashfunc)}
    signal output commitment;
    signal output nullifierHash;

${getHasherComponents(hashfunc)}
}

    `
}


function getGenericCircuit(extraPublicInputs, hashfunc) {
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
    ${genericCircuitHasK(hashfunc)}
    ${extraPublicInputs.length === 0 ? `` : `// Hidden signals to validate inputs so they can't be tampared with`}
    ${hiddenSignals}

    component commitmentHasher = CommitmentHasher();
    ${shouldPipeK(hashfunc)}
    commitmentHasher.nullifier <== nullifier;
    commitmentHasher.secret <== secret;

    // Check if the nullifierHash and commitment are valid
    commitmentHasher.nullifierHash === nullifierHash;
    commitmentHasher.commitment === commitmentHash;

    ${extraPublicInputs.length === 0 ? "" : `// An extra operation with the public signal to avoid tampering`}

    ${tamperingCheckConstraints}    

}

component main {public [nullifierHash,commitmentHash${publicInputParams}]} = CommitmentRevealScheme();
`
}

function getHashFuncImport(hashfunc) {
    switch (hashfunc) {
        case "mimc7":
            return `include "../node_modules/circomlib/circuits/mimc.circom";`
        case "mimcsponge": return `include "../node_modules/circomlib/circuits/mimcsponge.circom";`;
        case "poseidon":
            return `include "../node_modules/circomlib/circuits/poseidon.circom";`;
        case "pedersen":
            return `include "../node_modules/circomlib/circuits/pedersen.circom";
include "../node_modules/circomlib/circuits/bitify.circom";`;
        default:
            return ""
    }
}

function hasKInput(hashfunc) {
    if (hashfunc === "mimc7" || hashfunc === "mimcsponge") {
        return `signal input k;`
    } else
        return ``
}

function getHasherComponents(hashfunc) {
    switch (hashfunc) {
        case "mimc7":
            return `
    component commitmentMiMC7 = MultiMiMC7(2,91); 
    commitmentMiMC7.k <== k;
    commitmentMiMC7.in[0] <== nullifier;
    commitmentMiMC7.in[1] <== secret;

    commitment <== commitmentMiMC7.out;

    component nullifierMiMC7 = MultiMiMC7(1,91);

    nullifierMiMC7.k <== k;

    nullifierMiMC7.in[0] <== nullifier;

    nullifierHash <== nullifierMiMC7.out;`
        case "mimcsponge":
            return `
    component commitmentMiMCSponge = MiMCSponge(2,220,1); 
    commitmentMiMCSponge.k <== k;
    commitmentMiMCSponge.ins[0] <== nullifier;
    commitmentMiMCSponge.ins[1] <== secret;

    commitment <== commitmentMiMCSponge.outs[0];

    component nullifierMiMCSponge = MiMCSponge(1,220,1);

    nullifierMiMCSponge.k <== k;

    nullifierMiMCSponge.ins[0] <== nullifier;

    nullifierHash <== nullifierMiMCSponge.outs[0];`
        case "poseidon": return `        
    component commitmentPoseidon = Poseidon(2);

    commitmentPoseidon.inputs[0] <== nullifier;
    commitmentPoseidon.inputs[1] <== secret;

    commitment <== commitmentPoseidon.out;

    component nullifierPoseidon = Poseidon(1);

    nullifierPoseidon.inputs[0] <== nullifier;

    nullifierHash <== nullifierPoseidon.out;`
        case "pedersen": return `
    component commitmentPedersen = Pedersen(496);
    component nullifierPedersen = Pedersen(248);
    component secretBits =  Num2Bits(248);
    component nullifierBits = Num2Bits(248);

    nullifierBits.in <== nullifier;
    secretBits.in <== secret;
    for(var i = 0; i < 248; i++){
        nullifierPedersen.in[i] <== nullifierBits.out[i];
        commitmentPedersen.in[i] <== nullifierBits.out[i];
        commitmentPedersen.in[i + 248] <== secretBits.out[i];
    }

    commitment <== commitmentPedersen.out[0];
    nullifierHash  <== nullifierPedersen.out[0];`
        default:
            return ``
    }
}

function genericCircuitHasK(hashfunc) {
    switch (hashfunc) {
        case "mimc7":
            return `signal input k;`
        case "mimcsponge":
            return `signal input k;`
        default:
            return ""
    }
}

function shouldPipeK(hashfunc) {
    switch (hashfunc) {
        case "mimc7":
            return `commitmentHasher.k <== k;`
        case "mimcsponge":
            return `commitmentHasher.k <== k;`
        default:
            return "";
    }
}

module.exports = { getCommitmentHasher, getGenericCircuit }