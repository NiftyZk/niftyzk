const chalk = require("chalk");

const inquirer = require("inquirer").default

const fs = require("fs")
const path = require("path");
const { CIRCUITSDIR, LIBPATH, TESTPATH, COMPILEDDIR } = require("../paths.js");
const { fixedMerkletreeTemplate } = require("../templates/circom/fixedMerkleTree.js");

const { getCommitmentHasher, getGenericCircuit } = require("../templates/circom/genericCommitmentVerifier.js");

const { getJsLib, getTests } = require("../templates/js/templates.js");
const { getFixedMerkleTreeTemplate, runFixedMerkleTreejs, getFixedMerkleTreeTests } = require("../templates/js/fixedMerkletreeTemplate");

const PackageJson = require('@npmcli/package-json')


function circuitPrompts() {
    console.log("Generating a generic circuit with a commitment reveal scheme and a nullifier.")

    inquirer.prompt([
        {
            type: "list",
            name: "merkletree",
            message: "Do you want a merkle tree? Select fixed for a normal tree or Sparse to use the sparse merkle tree from circomlibjs",
            choices: ["no", "fixed", "sparse"],
            default: "No"
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
            default: true
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

        const { addpubinputs, pubInputs, hashfunc, merkletree } = answers;


        if (addpubinputs) {
            const publicInputsArr = sanitizePublicInputs(pubInputs)
            genCircuits(publicInputsArr, hashfunc, merkletree)


            await genJs(publicInputsArr, hashfunc, merkletree)

        } else {
            genCircuits([], hashfunc, merkletree)
            await genJs([], hashfunc, merkletree)
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

function genCircuits(publicInputsArr, hashfunc, merkletree) {
    console.log(chalk.yellow("Generating circuits"))


    if (!fs.existsSync(CIRCUITSDIR)) {
        fs.mkdirSync(CIRCUITSDIR)
    }

    const circuitTemplates = [
        {
            name: "commitment_hasher.circom",
            content: getCommitmentHasher(hashfunc)
        },
        {
            name: "circuit.circom",
            content: getGenericCircuit(publicInputsArr, hashfunc, merkletree)
        },
        {

            name: "merkletree.circom",
            content: fixedMerkletreeTemplate(hashfunc)
        }
    ]

    //write the circuits to file

    fs.writeFileSync(path.join(CIRCUITSDIR, circuitTemplates[0].name), circuitTemplates[0].content)
    fs.writeFileSync(path.join(CIRCUITSDIR, circuitTemplates[1].name), circuitTemplates[1].content)

    if (merkletree === "fixed") {
        fs.writeFileSync(path.join(CIRCUITSDIR, circuitTemplates[2].name), circuitTemplates[2].content)
    }


    //Delete the compiled directory from the circuits
    delete_compiled_if_exists()

}

async function genJs(extraPublicInputsArr, hashfunc, merkletree) {
    console.log(chalk.yellow("Generating javascript"))
    if (!fs.existsSync(LIBPATH)) {
        fs.mkdirSync(LIBPATH)
    }
    if (!fs.existsSync(TESTPATH)) {
        fs.mkdirSync(TESTPATH)
    }

    const lib = getJsLib(extraPublicInputsArr, hashfunc, merkletree)

    fs.writeFileSync(path.join(LIBPATH, "index.js"), lib)

    if (merkletree === "fixed") {
        const merkletreejs = getFixedMerkleTreeTemplate(hashfunc);
        const runjs = runFixedMerkleTreejs(hashfunc);
        const test = getFixedMerkleTreeTests(extraPublicInputsArr, hashfunc);

        fs.writeFileSync(path.join(TESTPATH, "index.test.js"), test)
        fs.writeFileSync(path.join(LIBPATH, "merkletree.js"), merkletreejs)
        fs.writeFileSync(path.join(LIBPATH, "run.js"), runjs)

        //write to package.json dependencies and add the commands to run run.js
        const pkgjson = await PackageJson.load(process.cwd())
        pkgjson.update({
            scripts: {
                ...pkgjson.content.scripts,
                new: "node ./lib/run.js new",
                proof: "node ./lib/run.js proof",
                verify: "node ./lib/run.js verify"
            }
        })
        await pkgjson.save();
    } else {
        const tests = getTests(extraPublicInputsArr, hashfunc)
        fs.writeFileSync(path.join(TESTPATH, "index.test.js"), tests)

    }
}

function delete_compiled_if_exists() {
    if (fs.existsSync(COMPILEDDIR)) {
        fs.rmSync(COMPILEDDIR, { recursive: true })
    }
}

module.exports = { circuitPrompts }