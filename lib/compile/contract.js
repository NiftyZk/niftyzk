
const { COMPILEDDIR, LIBPATH, UNIVERSALSETUPFILESDIR } = require("../paths");
const fs = require("fs");
const chalk = require("chalk");
const path = require("path");
const assert = require("assert");
const { files: arkGrothFiles, dirs: arkGrothDirs } = require("../templates/rust/arkworks_groth16/contractTemplate");
const { files: bellmanGrothFiles, dirs: bellmanGrothDirs } = require("../templates/rust/bellman_groth16/contractTemplate")
const { files: plonkFiles, dirs: plonkDirs } = require("../templates/rust/bellman_plonk/contractTemplate");
const { adapterFile } = require("../templates/rust/bellman_groth16/adapterTemplate");
const { verificationKeyAdapter, proofAdapter } = require("../templates/rust/bellman_groth16/adapter/vkeyAdapter");
const { groth16, wtns } = require("snarkjs");
const plonkit = require("../../rust/pkg/plonkit");
const inquirer = require("inquirer").default;
const { universalSetupFilesNotFountErrors, getSetupFiles } = require("../compile/runPlonkCompiler")

async function generateTestProof(circuitFileName) {
    const circuitname = circuitFileName.split(".");
    assert.equal(circuitname[1], "circom");
    let myModule;
    const modulePath = path.join(process.cwd(), "test", "input.js");

    await import(modulePath).then(module => myModule = module);

    const input = await myModule.getInput();

    const zkeyPath = fs.readFileSync(path.join(process.cwd(), "circuits", "compiled", "vk_meta.txt"), "utf-8");

    const wasmFilePath = path.join("circuits", "compiled", `${circuitname[0]}_js`, `${circuitname[0]}.wasm`);

    let p = await groth16.fullProve(input, wasmFilePath, zkeyPath);

    const { proof, publicSignals } = p

    const verificationKeyFile = fs.readFileSync(path.join(process.cwd(), "circuits", "compiled", "verification_key.json"), "utf-8")
    const verificationKey = JSON.parse(verificationKeyFile);

    let result = await groth16.verify(verificationKey, publicSignals, proof);

    assert(result, true);
    //Then use snarkjs to compute a proof, verify it
    //Then return a valid test_proof.json
    return JSON.stringify({ proof, publicSignals, verificationKey })
}

async function generateTestProofForPlonk(wasmFilePath, setupFile, r1csFile, witnessCalculatorPath) {
    let myTestInputModule;
    const modulePath = path.join(process.cwd(), "test", "input.js")
    await import(modulePath).then(module => myTestInputModule = module);

    const input = await myTestInputModule.getInput()

    const witnessPath = path.join(COMPILEDDIR, "tmp.wtns");
    await wtns.calculate(input, wasmFilePath, witnessPath).catch(err => console.log(err))

    process.env.BELLMAN_NO_GPU = "1";
    process.env.BELLMAN_CPU_THREADS = "1";

    const wtns_buff = fs.readFileSync(witnessPath)
    const setupfile_buff = fs.readFileSync(setupFile)
    const r1cs_buff = fs.readFileSync(r1csFile)
    let p = await plonkit.prove(setupfile_buff, r1cs_buff, wtns_buff, JSON.stringify(input, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ))

    fs.rmSync(witnessPath)

    return p;

}

async function verifyTestProofForPlonk(vkey_bin, proof_bin) {

    let valid = await plonkit.verify(vkey_bin, proof_bin)

    return valid
}


async function genContract(options, isPlonk) {
    const CONTRACTPATH = path.join(process.cwd(), options.folder)

    if (fs.existsSync(CONTRACTPATH)) {
        if (!options.overwrite) {
            console.log("Contract directory already exists!")
            console.log("Use the", chalk.blue("--overwrite"), "option to overwrite it's contents")
            return;
        } else {
            delete_for_overwrite(CONTRACTPATH)
        }
    }

    if (!isPlonk) {

        const verificationKeyPath = path.join(COMPILEDDIR, "verification_key.json");
        const testProof = await generateTestProof(options.circuit ?? "circuit.circom", isPlonk);

        if (!fs.existsSync(verificationKeyPath)) {
            console.log(chalk.red("Missing verification_key.json"))
            console.log("Run", chalk.blue("niftyzk vkey [--final]", "to generate a verification key."))
            return;
        }

        if (options.ark) {
            generateArkGroth16(verificationKeyPath, testProof, CONTRACTPATH);
        } else if (options.bellman) {
            generateBellmanGroth16(verificationKeyPath, testProof, CONTRACTPATH);
        }
    } else {
        const vkeyBinPath = path.join(COMPILEDDIR, "vkey.bin");

        if (!fs.existsSync(vkeyBinPath)) {
            console.log(chalk.red("Missing vkey.bin"))
            console.log("Run", chalk.blue("niftyzk compile", "to create the vkey file"))
            return;
        }

        const circuitFileName = options.circuit ?? "circuit.circom"
        const circuitname = circuitFileName.split(".");
        assert.equal(circuitname[1], "circom");

        const witnessCalculatorPath = path.join(COMPILEDDIR, circuitname[0] + "_js", "witness_calculator.js")
        const witnessWasmPath = path.join(COMPILEDDIR, circuitname[0] + "_js", circuitname[0] + ".wasm")

        if (!fs.existsSync(witnessWasmPath)) {
            console.log(chalk.red("Missing witness wasm file"))
            console.log("Run", chalk.blue("niftyzk compile", "to create the wasm file"))
            return;
        }

        const r1csPath = path.join(COMPILEDDIR, circuitname[0] + ".r1cs")

        if (!fs.existsSync(r1csPath)) {
            console.log(chalk.red("Missing r1cs file"))
            console.log("Run", chalk.blue("niftyzk compile", "to create the wasm file"))
            return;
        }


        if (!fs.existsSync(UNIVERSALSETUPFILESDIR)) {
            universalSetupFilesNotFountErrors()
            return
        }

        const setupFiles = getSetupFiles()
        if (setupFiles.length === 0) {
            universalSetupFilesNotFountErrors()
            return
        }

        inquirer.prompt([
            {
                type: "list",
                name: "setupfile",
                message: "Select the setup file you used to compile the circuit",
                choices: setupFiles
            }
        ]).then(async (answers) => {

            const setupFile = path.join(UNIVERSALSETUPFILESDIR, answers.setupfile)
            const testProof_bin = await generateTestProofForPlonk(witnessWasmPath, setupFile, r1csPath, witnessCalculatorPath)

            const vkey_bin = fs.readFileSync(vkeyBinPath);

            const valid = await verifyTestProofForPlonk(vkey_bin, testProof_bin)
            assert.equal(valid, true);

            //The vkey and the proof is binary, vec<u8> or uint8array

            await generatePlonk(vkey_bin, testProof_bin, CONTRACTPATH)

        }).catch((err) => {
            console.log(err)
            console.log("Contract generation aborted")
            process.exit(1)
        })
    }
}

function delete_for_overwrite(CONTRACTPATH) {
    fs.rmSync(CONTRACTPATH, { recursive: true })
}

async function generatePlonk(vk_bin, proof_bin, CONTRACTPATH) {
    const vkey_uint8Arr = new Uint8Array(vk_bin)

    const enc_vkey = JSON.stringify(Array.from(vkey_uint8Arr));
    const enc_proof = JSON.stringify(Array.from(proof_bin));

    // Make the directories
    if (!fs.existsSync(CONTRACTPATH)) {
        fs.mkdirSync(CONTRACTPATH)
    }

    // Make the directories
    if (!fs.existsSync(CONTRACTPATH)) {
        fs.mkdirSync(CONTRACTPATH)
    }

    for (let i = 0; i < plonkDirs.length; i++) {
        const dirpath = path.join(CONTRACTPATH, plonkDirs[i])
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath)
        }
    }

    for (let i = 0; i < plonkFiles.length; i++) {
        console.log("Writing", plonkFiles[i].name)
        if (plonkFiles[i].name === "src/contract.rs") {
            fs.writeFileSync(path.join(CONTRACTPATH, plonkFiles[i].name), plonkFiles[i].content({
                enc_proof,

            }));
        } else if (plonkFiles[i].name === "src/verify.rs") {
            fs.writeFileSync(path.join(CONTRACTPATH, plonkFiles[i].name), plonkFiles[i].content({
                enc_vkey,
                enc_proof
            }));
        } else {
            fs.writeFileSync(path.join(CONTRACTPATH, plonkFiles[i].name), plonkFiles[i].content());
        }
    }

    console.log(chalk.green("Done"))
    process.exit(0)


}

async function generateArkGroth16(verificationKeyPath, testProof, CONTRACTPATH) {
    const verificationKeyBuff = fs.readFileSync(verificationKeyPath).toString();

    const verificationKeyString = verificationKeyBuff.toString();
    const testProofJson = JSON.parse(testProof);
    try {
        compareVerificationKeyWithTestProof(JSON.parse(verificationKeyString), testProofJson)
    } catch (err) {
        console.error(err)
        console.log("The generated verification key and the tested one are not the same")
        console.log("Run", chalk.blue("npm run test"), "to generate new test proof and key")
        return;
    }

    // Make the directories
    if (!fs.existsSync(CONTRACTPATH)) {
        fs.mkdirSync(CONTRACTPATH)
    }

    for (let i = 0; i < arkGrothDirs.length; i++) {
        const dirpath = path.join(CONTRACTPATH, arkGrothDirs[i])
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath)
        }
    }


    //    Write the files
    for (let i = 0; i < arkGrothFiles.length; i++) {
        console.log("Writing", arkGrothFiles[i].name)
        if (arkGrothFiles[i].name === "src/contract.rs") {
            fs.writeFileSync(path.join(CONTRACTPATH, arkGrothFiles[i].name), arkGrothFiles[i].content({
                exampleProofString: JSON.stringify(testProofJson.proof),
                examplePublicInputs: JSON.stringify(testProofJson.publicSignals)
            }));
        } else if (arkGrothFiles[i].name === "src/verify.rs") {
            fs.writeFileSync(path.join(CONTRACTPATH, arkGrothFiles[i].name), arkGrothFiles[i].content({
                vKey_str: verificationKeyString,
                example_public_inputs_arr: JSON.stringify(testProofJson.publicSignals),
                example_proof_string: JSON.stringify(testProofJson.proof)
            }));
        } else {
            fs.writeFileSync(path.join(CONTRACTPATH, arkGrothFiles[i].name), arkGrothFiles[i].content());
        }
    }

    console.log(chalk.green("Done"))
    process.exit(0)
}

//This does a deep comparison to make sure the tested vkey is the same as the last generated one
function compareVerificationKeyWithTestProof(vkj, testProofJson) {
    const tpvk = testProofJson.verificationKey;

    assert.equal(vkj.protocol, tpvk.protocol)
    assert.equal(vkj.curve, tpvk.curve)
    assert.equal(vkj.nPublic, tpvk.nPublic)

    const assert_parameter = (name) => {
        for (let i = 0; i < vkj[name].length; i++) {
            for (let j = 0; j < vkj[name][i].length; j++) {
                assert.equal(vkj[name][i][j], tpvk[name][i][j])
            }
        }
    }

    for (let i = 0; i < vkj.vk_alpha_1.length; i++) {
        assert.equal(vkj.vk_alpha_1[i], tpvk.vk_alpha_1[i])
    }

    assert_parameter("vk_beta_2")
    assert_parameter("vk_gamma_2")
    assert_parameter("vk_delta_2")

    for (let i = 0; i < vkj.vk_alphabeta_12.length; i++) {
        for (let j = 0; j < vkj.vk_alphabeta_12[i].length; j++) {
            for (let k = 0; k < vkj.vk_alphabeta_12[i][j].length; k++) {
                assert.equal(vkj.vk_alphabeta_12[i][j][k], tpvk.vk_alphabeta_12[i][j][k])

            }
        }
    }

    //Compare the IC fields
    for (let i = 0; i < vkj.IC.length; i++) {
        for (let j = 0; j < vkj.IC[i].length; j++) {

            assert.equal(vkj.IC[i][j], tpvk.IC[i][j])
        }
    }

    return true;
}

async function generateBellmanGroth16(verificationKeyPath, testProof, CONTRACTPATH) {
    const verificationKeyBuff = fs.readFileSync(verificationKeyPath).toString();
    // const testProofBuff = fs.readFileSync(testProofPath).toString();

    const verificationKeyString = verificationKeyBuff.toString();
    // const testProofString = testProofBuff.toString();
    const testProofJson = JSON.parse(testProof);

    try {
        compareVerificationKeyWithTestProof(JSON.parse(verificationKeyString), testProofJson)
    } catch (err) {
        console.error(err);
        console.log("The generated verification key and the tested one are not the same")
        console.log("Run", chalk.blue("npm run test"), "to generate new test proof and key")
        return;
    }

    // Make the directories
    if (!fs.existsSync(CONTRACTPATH)) {
        fs.mkdirSync(CONTRACTPATH)
    }

    for (let i = 0; i < bellmanGrothDirs.length; i++) {
        const dirpath = path.join(CONTRACTPATH, bellmanGrothDirs[i]);
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath)
        }
    }

    //Uncompress the verification key
    const uncompressed_vkey = await verificationKeyAdapter(verificationKeyString)
    const uncompressed_proof = await proofAdapter(verificationKeyString, JSON.stringify(testProofJson.proof));
    const publicSignals = testProofJson.publicSignals;
    const vkeyICSize = JSON.parse(verificationKeyString).IC.length;

    for (let i = 0; i < bellmanGrothFiles.length; i++) {
        console.log("Writing", bellmanGrothFiles[i].name);

        if (bellmanGrothFiles[i].name === "src/parser.rs") {
            fs.writeFileSync(path.join(CONTRACTPATH, bellmanGrothFiles[i].name), bellmanGrothFiles[i].content({
                vkey_ic_size: vkeyICSize,
                uncompressed_proof: uncompressed_proof
            }))
        } else if (bellmanGrothFiles[i].name === "src/verify.rs") {
            fs.writeFileSync(path.join(CONTRACTPATH, bellmanGrothFiles[i].name), bellmanGrothFiles[i].content({
                inputs_length: publicSignals.length,
                uncompressed_vkey_str: uncompressed_vkey,
                uncompressed_proof_str: uncompressed_proof,
                public_input_str: JSON.stringify(publicSignals)
            }))
        } else if (bellmanGrothFiles[i].name === "src/contract.rs") {
            fs.writeFileSync(path.join(CONTRACTPATH, bellmanGrothFiles[i].name), bellmanGrothFiles[i].content({
                uncompressed_proof_str: uncompressed_proof,
                pub_input_str: JSON.stringify(publicSignals)
            }))
        } else {
            fs.writeFileSync(path.join(CONTRACTPATH, bellmanGrothFiles[i].name), bellmanGrothFiles[i].content())
        }

    }
    console.log("Writing lib/adapter.js")
    fs.writeFileSync(path.join(LIBPATH, "adapter.js"), adapterFile.content())

    console.log("Done")
    process.exit(0)
}

module.exports = { genContract }