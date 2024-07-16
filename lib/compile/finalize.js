const { zKey } = require("snarkjs")
const Logger = require("logplease");
const { getLatest, parseFileName } = require("../phase2ceremony/files");
const logger = Logger.create("niftyzk", { showTimestamp: false });
const path = require("path");
const { ZKEYSDIR, COMPILEDDIR, PTAUFILESDIR } = require("../paths");
const { getR1CSFileName, getPtauFiles } = require("./runcompiler");
const chalk = require("chalk");

async function finalize(beacon, iter, name) {
    const iterations = parseIter(iter)
    //TODO: Check if there is already a final.zkey
    const latestFilename = await new Promise((resolve, reject) => { getLatest(resolve) })
    const parsedName = parseFileName(latestFilename)
    const finalName = `${parsedName.name}_final.zkey`

    const ptauFiles = getPtauFiles()

    if (ptauFiles.length === 0) {
        console.log(chalk.red("Ptau file missing"))
        return;
    }
    if (ptauFiles.length > 1) {
        console.log(chalk.red("Too many ptau files detected"));
        return;
    }
    const beaconHash = hex2ByteArray(beacon);
    if ((beaconHash.byteLength == 0)
        || (beaconHash.byteLength * 2 != beacon.length)) {
        if (logger) logger.error("Invalid Beacon Hash. (It must be a valid hexadecimal sequence)");
        return;
    }

    const ptauFileName = ptauFiles[0];
    const r1csFile = getR1CSFileName()


    await zkeyBeacon({
        zkeyOldName: path.join(ZKEYSDIR, latestFilename),
        zkeyNewName: path.join(ZKEYSDIR, finalName),
        beaconHashStr: beacon,
        numIterationsExp: iterations,
        name: parseName(name)
    }).then(async () => {
        await verifyFinalZkey(path.join(COMPILEDDIR, r1csFile), path.join(PTAUFILESDIR, ptauFileName), path.join(ZKEYSDIR, finalName)).then(() => process.exit(0))
    })
}

async function verifyFinalZkey(r1csFileName, pTauFilename, zkeyFileName) {
    await zKey.verifyFromR1cs(r1csFileName, pTauFilename, zkeyFileName, logger)
}


async function zkeyBeacon({ zkeyOldName, zkeyNewName, beaconHashStr, numIterationsExp, name }) {

    Logger.setLogLevel("DEBUG");

    // Discard contribuionHash  
    await zKey.beacon(zkeyOldName, zkeyNewName, name, beaconHashStr, numIterationsExp, logger);

    return 0;
}


function parseIter(iter) {
    if (isNaN(parseInt(iter))) {
        return 10
    }
    return parseInt(iter)
}

function parseName(name) {
    if (!name) {
        return "Final Beacon phase2"
    }
    return name;
}

function hex2ByteArray(s) {
    if (s instanceof Uint8Array) return s;
    if (s.slice(0, 2) == "0x") s = s.slice(2);
    return new Uint8Array(s.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    }));
}


module.exports = { finalize }