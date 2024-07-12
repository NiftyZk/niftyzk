//Generates metadata about the contents of the config file for the circuits

function generateCircuitMetadata({ extraPublicInputsArr }) {
    const json = {
        privateInputs: ["nullifier", "secret"],
        publicInputs: ["nullifierHash", "commitmentHash"].concat(extraPublicInputsArr)
    }
    return JSON.stringify(json)
}
