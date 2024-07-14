const { zKey } = require("snarkjs");

async function verifyNewZKey(r1csFileName, pTauFilename, zkeyFileName) {
    return await zKey.verifyFromR1cs(r1csFileName, pTauFilename, zkeyFileName)
}

async function verify(buff, detectFile) {
    const uint8Array = new Uint8Array(buff);

    const ptauFileName = await new Promise((resolve, reject) => { detectFile("ptau", resolve) })
    const r1csFileName = await new Promise((resolve, reject) => { detectFile("r1cs", resolve) });

    const zkeyMemfile = { type: "mem", data: uint8Array };

    return { valid: await verifyNewZKey(r1csFileName, ptauFileName, zkeyMemfile), ptauFileName, r1csFileName };
}


module.exports = { verify }