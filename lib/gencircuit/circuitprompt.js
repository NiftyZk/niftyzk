const chalk = require("chalk");

const inquirer = require("inquirer").default

const fs = require("fs")
const path = require("path");
const { CIRCUITSDIR, LIBPATH, TESTPATH, COMPILEDDIR, INPUTPATH, CIRCUITSDIRWITHCUSTOMDIR, COMPILEDDIRWITHCUSTOMDIR, TESTPATHWITHCUSTOMDIR, INPUTPATHWITHCUSTOMDIR, LIBPATHWITHCUSTOMDIR } = require("../paths.js");
const { fixedMerkletreeTemplate } = require("../templates/circom/fixedMerkleTree.js");

const { getCommitmentHasher, getGenericCircuit } = require("../templates/circom/genericCommitmentVerifier.js");

const { getJsLib, getTests } = require("../templates/js/templates.js");
const { getFixedMerkleTreeTemplate, runFixedMerkleTreejsCommitReveal, runFixedMerkleTreejsEDDSA } = require("../templates/js/fixedMerkletreeTemplate");

const PackageJson = require('@npmcli/package-json');
const { getInputsFile } = require("../templates/js/hotreload.js");
const { getEddsaCircuit } = require("../templates/circom/eddsa.js");
const { getSMTjs, SMTTestjs } = require("../templates/js/smt.js");

function circuitPrompts(dirname) {
    inquirer.prompt([
        {
            type: "list",
            name: "scheme",
            message: "What project do you want to scaffold?",
            choices: [
                { name: "Commit-Reveal Scheme", value: "crs" },
                { name: "Commit-Reveal Scheme with Fixed Merkle Tree", value: "crs-merkle" },
                { name: "EdDSA signature verification", value: "eddsa" },
                { name: "EdDSA signature verification with Fixed Merkle Tree", value: "eddsa-merkle" },
                { name: "Sparse Merkle Tree with EdDSA, inclusion/exclusion proofs", value: "smt-eddsa-inc/exc" },
                { name: "Sparse Merkle Tree with EdDSA, insert/update/delete", value: "smt-eddsa-ins/upd/del" }
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
            default: false,
            when(answers) {
                return answers.scheme === "crs" || answers.scheme === "crs-merkle";

            }
        },
        {
            type: "confirm",
            name: "addpubinputs",
            message: "Do you wish to add public inputs to sign? (E.g: address,amount)",
            default: false,
            when(answers) {
                return answers.scheme === "eddsa" || answers.scheme === "eddsa-merkle" || answers.scheme === "smt-eddsa-inc/exc" || answers.scheme === "smt-eddsa-ins/upd/del"
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

        const merkletree = getMerkleTree(scheme);


        if (addpubinputs) {
            const publicInputsArr = sanitizePublicInputs(pubInputs)
            genCircuits({ publicInputsArr, hashfunc, merkletree, scheme, dirname })

            await genJs({ extraPublicInputsArr: publicInputsArr, hashfunc, merkletree, scheme, dirname })

        } else {
            genCircuits({ publicInputsArr: [], hashfunc, merkletree, scheme, dirname })
            await genJs({ extraPublicInputsArr: [], hashfunc, merkletree, scheme, dirname })
        }

        console.log(chalk.green("Done"))
        console.log(`Run ${chalk.blue("npm install")} in your project folder`)

    }).catch(err => {
        console.log(err)
        console.log("Aborted")
    })
}

function getMerkleTree(scheme) {
    if (scheme === "crs" || scheme === "eddsa") {
        return "no"
    }
    if (scheme === "crs-merkle" || scheme === "eddsa-merkle") {
        return "fixed"
    }
    if (scheme === "smt-eddsa-inc/exc" || scheme === "smt-eddsa-ins/upd/del") {
        return "sparse"
    }
    //Default
    return "no"
}

function sanitizePublicInputs(pubInputString) {

    const array = pubInputString.toLowerCase().replaceAll(" ", "").split(",")
    for (let i = 0; i < array.length; i++) {
        if (!onlyLowercaseLetters(array[i])) {
            console.log(`Invalid public input name ${chalk.red(array[i])}`)
            throw new Error("Invalid input")
        }
        if (array[i] === "") {
            console.log(`Invalid input, can't be empty`);
            throw new Error("Invalid input")
        }
    }
    //remove duplicates
    return Array.from(new Set(array));
}

function onlyLowercaseLetters(str) {
    return /^[a-z]*$/.test(str)
}

//TODO: if dirname is defined then all the directory paths need to have the dirname injected to the beginning

function genCircuits({ publicInputsArr, hashfunc, merkletree, scheme, dirname }) {
    console.log(chalk.yellow("Generating circuits"))

    const circuitsDir = dirname == undefined ? CIRCUITSDIR : CIRCUITSDIRWITHCUSTOMDIR(dirname);


    if (!fs.existsSync(circuitsDir)) {
        fs.mkdirSync(circuitsDir)
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


        fs.writeFileSync(path.join(circuitsDir, commitment_hasher.name), commitment_hasher.content)

        fs.writeFileSync(path.join(circuitsDir, circuit_circom.name), circuit_circom.content)

        if (merkletree === "fixed") {

            let merkleTree_circuit = {

                name: "merkletree.circom",
                content: fixedMerkletreeTemplate(hashfunc)
            }

            fs.writeFileSync(path.join(circuitsDir, merkleTree_circuit.name), merkleTree_circuit.content)
        }

    }

    if (scheme === "eddsa" || scheme === "eddsa-merkle" || scheme === "smt-eddsa-inc/exc" || scheme === "smt-eddsa-ins/upd/del") {
        // All the eddsa circuit stuff is handled here, the SMT uses EdDSA too.
        let circuit_circom = {
            name: "circuit.circom",
            content: getEddsaCircuit(publicInputsArr, hashfunc, merkletree, scheme)
        }

        fs.writeFileSync(path.join(circuitsDir, circuit_circom.name), circuit_circom.content)

        if (merkletree === "fixed") {

            let merkleTree_circuit = {

                name: "merkletree.circom",
                content: fixedMerkletreeTemplate(hashfunc)
            }

            fs.writeFileSync(path.join(circuitsDir, merkleTree_circuit.name), merkleTree_circuit.content)
        }

    }

    //Delete the compiled directory from the circuits
    delete_compiled_if_exists(dirname)

}

async function genJs({ extraPublicInputsArr, hashfunc, merkletree, scheme, dirname }) {

    const libpath = dirname === undefined ? LIBPATH : LIBPATHWITHCUSTOMDIR(dirname);
    const testpath = dirname === undefined ? TESTPATH : TESTPATHWITHCUSTOMDIR(dirname)
    const inputpath = dirname === undefined ? INPUTPATH : INPUTPATHWITHCUSTOMDIR(dirname)
    const pkgjsonpath = dirname === undefined ? process.cwd() : path.join(process.cwd(), dirname);

    console.log(chalk.yellow("Generating javascript"))
    if (!fs.existsSync(libpath)) {
        fs.mkdirSync(libpath)
    }
    if (!fs.existsSync(testpath)) {
        fs.mkdirSync(testpath)
    }

    const lib = getJsLib(scheme, extraPublicInputsArr, hashfunc, merkletree)
    const inputfile = getInputsFile(scheme, hashfunc, merkletree, extraPublicInputsArr)
    fs.writeFileSync(path.join(libpath, "index.js"), lib)
    fs.writeFileSync(path.join(inputpath), inputfile);

    const tests = getTests(extraPublicInputsArr, hashfunc, scheme)
    fs.writeFileSync(path.join(testpath, "index.test.js"), tests)

    const pkgjson = await PackageJson.load(pkgjsonpath)

    if (merkletree === "fixed") {

        const merkletreejs = getFixedMerkleTreeTemplate(hashfunc, scheme === "crs" || scheme === "crs-merkle", scheme);
        const runjs = scheme === "eddsa-merkle" ? runFixedMerkleTreejsEDDSA(hashfunc) : runFixedMerkleTreejsCommitReveal(hashfunc);

        fs.writeFileSync(path.join(libpath, "merkletree.js"), merkletreejs)
        fs.writeFileSync(path.join(libpath, "run.js"), runjs)

        //write to package.json dependencies and add the commands to run run.js
        pkgjson.update({
            scripts: {
                ...pkgjson.content.scripts,
                new: "node ./lib/run.js new",
                proof: "node ./lib/run.js proof",
                verify: "node ./lib/run.js verify"
            }
        })

    }
    else if (merkletree === "sparse") {
        const smtjs = getSMTjs();
        fs.writeFileSync(path.join(libpath, "smt.js"), smtjs);
        const smtTest = SMTTestjs();
        fs.writeFileSync(path.join(testpath, "smt.test.js"), smtTest)

        pkgjson.update({
            scripts: {
                ...pkgjson.content.scripts
            }
        })
    } else {

        pkgjson.update({
            scripts: {
                ...pkgjson.content.scripts
            }
        })
    }

    await pkgjson.save();
}

function delete_compiled_if_exists(dirname) {
    const dir = dirname === undefined ? COMPILEDDIR : COMPILEDDIRWITHCUSTOMDIR(dirname)

    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true })
    }
}

module.exports = { circuitPrompts }