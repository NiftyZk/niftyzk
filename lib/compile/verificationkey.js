const { zKey } = require("snarkjs");
const { utils } = require("ffjavascript")
const Logger = require("logplease")
const bfj = require("bfj");
const fs = require("fs");
const { ZKEYSDIR, COMPILEDDIR } = require("../paths");
const path = require("path")
const logger = Logger.create("niftyzk", { showTimestamp: false });
const { stringifyBigInts } = utils;

async function verificationKey(final) {
    const verificationKeyPath = path.join(COMPILEDDIR, "verification_key.json")
    const zkeyname = final ? findFinalZkey() : findFirstZkey()
    const zkeyPath = path.join(ZKEYSDIR, zkeyname)
    await zkeyExportVKey(zkeyPath, verificationKeyPath)
}

async function zkeyExportVKey(zKeyFileName, vKeyFileName) {

    Logger.setLogLevel("DEBUG");

    const vKey = await zKey.exportVerificationKey(zKeyFileName, logger);

    await bfj.write(vKeyFileName, stringifyBigInts(vKey), { space: 1 }).then(() => {
        verificationkey_meta(zKeyFileName)
    });

    return 0;
}

function findFirstZkey() {
    const files = fs.readdirSync(ZKEYSDIR)
    if (files.length === 0) {
        throw new Error("Missing ZKeys")
    }

    const firstKey = files.filter(fil => fil.includes("_0000.zkey"))
    if (firstKey.length === 0) {
        throw new Error("Can't find 0000.zkey")
    }
    return firstKey[0]
}

function findFinalZkey() {
    const files = fs.readdirSync(ZKEYSDIR);
    if (files.length === 0) {
        throw new Error("Missing Zkeys")
    }
    const finalZkey = files.filter(fil => fil.includes("final.zkey"))
    if (finalZkey.length === 0) {
        throw new Error("Can't find final.zkey")
    }
    return finalZkey[0]
}

//A file that stores the name of the zkey that was used for generating the verification key
function verificationkey_meta(zkeyName) {
    fs.writeFileSync(path.join(COMPILEDDIR, "vk_meta.txt"), zkeyName);
}

module.exports = { verificationKey }