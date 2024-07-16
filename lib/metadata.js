const fs = require("fs");
const { NIFTYJSON } = require("./paths");

//Generates metadata about the contents of the config file for the circuits

function generateCircuitMetadata({ extraPublicInputsArr }) {
    const json = {
        privateInputs: ["nullifier", "secret"],
        publicInputs: ["nullifierHash", "commitmentHash"].concat(extraPublicInputsArr)
    }
    return JSON.stringify(json)
}

//TODO: Test this and adding ptau file to metadata
function addPtauToMetadata(ptauFilename) {
    const fileBuff = fs.readFileSync(NIFTYJSON)
    const meta = JSON.parse(fileBuff.toString())
    meta.ptau = ptauFilename
    fs.writeFileSync(NIFTYJSON, JSON.stringify(meta))
}

module.exports = { generateCircuitMetadata }