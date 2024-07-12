
function getExtraPublicInputs(extraPublicInputs) {
    let signalInputDeclarations = "";
    let hiddenSignals = "";
    let tamperingCheckConstraints = "";
    let publicInputParams = extraPublicInputs.length === 0 ? "" : ","

    for (let i = 0; i < extraPublicInputs.length; i++) {
        signalInputDeclarations += `signal input ${extraPublicInputs[i]};\n    `
        hiddenSignals += `signal ${extraPublicInputs[i]}Square;\n    `
        tamperingCheckConstraints += `${extraPublicInputs[i]}Square <== ${extraPublicInputs[i]} * ${extraPublicInputs[i]};\n    `
        publicInputParams += `${extraPublicInputs[i]}${i === extraPublicInputs.length - 1 ? "" : ","}`
    }

    return { signalInputDeclarations, hiddenSignals, tamperingCheckConstraints, publicInputParams };
}


module.exports = { getExtraPublicInputs }