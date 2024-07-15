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

module.exports = { finalize }