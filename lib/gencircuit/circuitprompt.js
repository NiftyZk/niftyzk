const chalk = require("chalk");

const inquirer = require("inquirer").default

const fs = require("fs")
const path = require("path");
const { CIRCUITSDIR, LIBPATH, TESTPATH, COMPILEDDIR, INPUTPATH } = require("../paths.js");
const { fixedMerkletreeTemplate } = require("../templates/circom/fixedMerkleTree.js");

const { getCommitmentHasher, getGenericCircuit } = require("../templates/circom/genericCommitmentVerifier.js");

const { getJsLib, getTests } = require("../templates/js/templates.js");
const { getFixedMerkleTreeTemplate, runFixedMerkleTreejs, getFixedMerkleTreeTests } = require("../templates/js/fixedMerkletreeTemplate");

const PackageJson = require('@npmcli/package-json');
const { getInputsFile } = require("../templates/js/hotreload.js");
const { getEddsaCircuit } = require("../templates/circom/eddsa.js");

function circuitPrompts() {
    inquirer.prompt([
        {
            type: "list",
            name: "scheme",
            message: "What project do you want to scaffold?",
            choices: [
                { name: "Commit-Reveal Scheme", value: "crs" },
                { name: "Commit-Reveal Scheme with Fixed Merkle Tree", value: "crs-merkle" },
                { name: "EdDSA signature verification", value: "eddsa" },
                { name: "EdDSA signature verification with Fixed Merkle Tree", value: "eddsa-merkle" }
            ],
            default: "crs"
        },
        {
            type: "list",
            name: "hashfunc",
            message: "Choose the hashing algorithm to use: ",
            choices: ["mimc7", "mimcsponge", "pedersen", "poseidon"]
        },
        {
            type: "confirm",
            name: "addpubinputs",
            message: "Do you wish to add tamperproof public inputs? (E.g: walletaddress): ",
            default: true,
            when(answers) {
                return answers.scheme === "crs" || answers.scheme === "crs-merkle";

            }
        },
        {
            type: "confirm",
            name: "addpubinputs",
            message: "Do you wish to add public inputs to sign? (E.g: address,amount)",
            default: true,
            when(answers) {
                return answers.scheme === "eddsa" || answers.scheme === "eddsa-merkle"
            }
        },
        {
            type: "input",
            name: "pubInputs",
            message: "Enter the name of the public inputs in a comma separated list (no numbers or special characters): ",
            when(answers) {
                return answers["addpubinputs"];
            }
        }
    ]).then(async (answers) => {

        const { addpubinputs, pubInputs, hashfunc, scheme } = answers;

        const merkletree = scheme === "crs" || scheme === "eddsa" ? "no" : "fixed"


        if (addpubinputs) {
            const publicInputsArr = sanitizePublicInputs(pubInputs)
            genCircuits({ publicInputsArr, hashfunc, merkletree, scheme })

            await genJs({ extraPublicInputsArr: publicInputsArr, hashfunc, merkletree, scheme })

        } else {
            genCircuits({ publicInputsArr: [], hashfunc, merkletree, scheme })
            await genJs({ extraPublicInputsArr: [], hashfunc, merkletree, scheme })
        }

        console.log(chalk.green("Done"))

    }).catch(err => {
        console.log(err)
        console.log("Aborted")
    })
}

function sanitizePublicInputs(pubInputString) {
    const array = pubInputString.toLowerCase().replaceAll(" ", "").split(",")
    for (let i = 0; i < array.length; i++) {
        if (!onlyLowercaseLetters(array[i])) {
            console.log(`Invalid public input name ${chalk.red(array[i])}`)
            throw new Error("Invalid input")
        }
    }
    //remove duplicates
    return Array.from(new Set(array));
}

function onlyLowercaseLetters(str) {
    return /^[a-z]*$/.test(str)
}

function genCircuits({ publicInputsArr, hashfunc, merkletree, scheme }) {
    console.log(chalk.yellow("Generating circuits"))

    if (!fs.existsSync(CIRCUITSDIR)) {
        fs.mkdirSync(CIRCUITSDIR)
    }

    if (scheme === "crs" || scheme === "crs-merkle") {
        //write the circuits to file
        let commitment_hasher = {
            name: "commitment_hasher.circom",
            content: getCommitmentHasher(hashfunc)
        }

        let circuit_circom = {
            name: "circuit.circom",
            content: getGenericCircuit(publicInputsArr, hashfunc, merkletree)
        };


        fs.writeFileSync(path.join(CIRCUITSDIR, commitment_hasher.name), commitment_hasher.content)

        fs.writeFileSync(path.join(CIRCUITSDIR, circuit_circom.name), circuit_circom.content)

        if (merkletree === "fixed") {

            let merkleTree_circuit = {

                name: "merkletree.circom",
                content: fixedMerkletreeTemplate(hashfunc)
            }

            fs.writeFileSync(path.join(CIRCUITSDIR, merkleTree_circuit.name), merkleTree_circuit.content)
        }

    }

    if (scheme === "eddsa" || scheme === "eddsa-merkle") {

        let circuit_circom = {
            name: "circuit.circom",
            content: getEddsaCircuit(publicInputsArr, hashfunc, merkletree)
        }

        fs.writeFileSync(path.join(CIRCUITSDIR, circuit_circom.name), circuit_circom.content)

        if (merkletree === "fixed") {

            let merkleTree_circuit = {

                name: "merkletree.circom",
                content: fixedMerkletreeTemplate(hashfunc)
            }

            fs.writeFileSync(path.join(CIRCUITSDIR, merkleTree_circuit.name), merkleTree_circuit.content)
        }

    }

    //Delete the compiled directory from the circuits
    delete_compiled_if_exists()

}

async function genJs({ extraPublicInputsArr, hashfunc, merkletree, scheme }) {

    console.log(chalk.yellow("Generating javascript"))
    if (!fs.existsSync(LIBPATH)) {
        fs.mkdirSync(LIBPATH)
    }
    if (!fs.existsSync(TESTPATH)) {
        fs.mkdirSync(TESTPATH)
    }

    const lib = getJsLib(scheme, extraPublicInputsArr, hashfunc, merkletree)
    const inputfile = getInputsFile(scheme, hashfunc, merkletree, extraPublicInputsArr)

    fs.writeFileSync(path.join(LIBPATH, "index.js"), lib)
    fs.writeFileSync(path.join(INPUTPATH), inputfile);

    const pkgjson = await PackageJson.load(process.cwd())

    if (merkletree === "fixed") {

        const merkletreejs = getFixedMerkleTreeTemplate(hashfunc, scheme === "crs" || scheme === "crs-merkle");
        const runjs = runFixedMerkleTreejs(hashfunc);
        const test = getFixedMerkleTreeTests(extraPublicInputsArr, hashfunc);

        fs.writeFileSync(path.join(TESTPATH, "index.test.js"), test)
        fs.writeFileSync(path.join(LIBPATH, "merkletree.js"), merkletreejs)
        fs.writeFileSync(path.join(LIBPATH, "run.js"), runjs)

        //write to package.json dependencies and add the commands to run run.js
        pkgjson.update({
            scripts: {
                ...pkgjson.content.scripts,
                new: "node ./lib/run.js new",
                proof: "node ./lib/run.js proof",
                verify: "node ./lib/run.js verify"
            }
        })

    } else {
        const tests = getTests(extraPublicInputsArr, hashfunc)
        fs.writeFileSync(path.join(TESTPATH, "index.test.js"), tests)
        pkgjson.update({
            scripts: {
                ...pkgjson.content.scripts
            }
        })
    }

    await pkgjson.save();
}

function delete_compiled_if_exists() {
    if (fs.existsSync(COMPILEDDIR)) {
        fs.rmSync(COMPILEDDIR, { recursive: true })
    }
}

module.exports = { circuitPrompts }