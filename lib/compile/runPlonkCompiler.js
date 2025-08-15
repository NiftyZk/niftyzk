const fs = require("fs");
const path = require("path");
const { UNIVERSALSETUPFILESDIR, COMPILEDDIR } = require("../paths");
const chalk = require("chalk");
const { execSync } = require("child_process");
const inquirer = require("inquirer").default;
const wasm = require("../../rust/pkg/plonkit");


function compileWithPlonkit(filePath) {

    if (!fs.existsSync(UNIVERSALSETUPFILESDIR)) {
        universalSetupFilesNotFountErrors()
        return
    }

    const setupFiles = getSetupFiles()
    if (setupFiles.length === 0) {
        universalSetupFilesNotFountErrors()
        return
    }


    if (!fs.existsSync(COMPILEDDIR)) {
        fs.mkdirSync(COMPILEDDIR)
    }

    let compileOut;
    try {
        compileOut = execSync(`circom ${filePath === "" ? "./circuits/circuit.circom" : filePath} --r1cs --wasm --sym -o ./circuits/compiled`)
    } catch (err) {
        console.log(err)
        return;
    }
    console.log(compileOut.toString())

    inquirer.prompt([
        {
            type: "list",
            name: "setupfile",
            message: "Select the setup file to use for the plonk setup",
            choices: setupFiles
        }
    ]).then(async (answers) => {

        const filename = answers.setupfile;
        const r1csFilename = getR1CSFileName()

        const r1csPath = path.join(process.cwd(), "circuits", "compiled", r1csFilename)
        const setupFilePath = path.join(process.cwd(), "setupfiles", filename)
        const vkOutPath = path.join(process.cwd(), "circuits", "compiled", "vkey.bin")
        process.env.BELLMAN_NO_GPU = "1";
        process.env.BELLMAN_CPU_THREADS = "1";
        res = wasm.export_verification_key(setupFilePath, r1csPath, vkOutPath)
        if (res) {
            console.log(chalk.green("Plonk ready. No need for additional setup ceremonies"))
        } else {
            console.log(chalk.red("Unable to setup Plonk"))
        }
        process.exit(0)


    }).catch((err) => {
        console.log(err)
        console.log("Circuit setup aborted")
        process.exit(1)
    })


}


function getSetupFiles() {
    const filenames = fs.readdirSync(UNIVERSALSETUPFILESDIR)
    let foundFiles = [];
    for (let i = 0; i < filenames.length; i++) {

        if (filenames[i].slice(-4) === ".key") {
            foundFiles.push(filenames[i])
        }
    }
    return foundFiles
}

function getR1CSFileName() {
    const filenames = fs.readdirSync(COMPILEDDIR);
    let r1csfile = "";
    for (let i = 0; i < filenames.length; i++) {
        if (filenames[i].slice(-5) === ".r1cs") {
            r1csfile = filenames[i]
            break;
        }
    }
    return r1csfile;
}

function universalSetupFilesNotFountErrors() {
    console.log(chalk.red("You need to download the universal setup files for plonk"))
    console.log("Run ", chalk.blue("niftyzk plonkfiles"))

}


module.exports = { compileWithPlonkit,getSetupFiles, universalSetupFilesNotFountErrors }