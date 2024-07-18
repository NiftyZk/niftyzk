const { COMPILEDDIR, CONTRACTPATH } = require("../paths");
const fs = require("fs");
const chalk = require("chalk");
const path = require("path");
const assert = require("assert");
const { files: arkGrothFiles, dirs: arkGrothDirs } = require("../templates/rust/arkworks_groth16/contractTemplate");

async function genContract(options) {
    const verifcationKeyPath = path.join(COMPILEDDIR, "verification_key.json");
    const testProofPath = path.join(COMPILEDDIR, "test_proof.json");

    if (!fs.existsSync(testProofPath)) {
        console.log(chalk.red("Missing test_proof.json"));
        console.log("Run", chalk.blue("npm run test"), "and make sure it writes a valid proof and publicSignals and verificationKey to circuits/compiled/test_proof.json")
        console.log("The file is used to generate smart contract tests")
        return;
    }

    if (!fs.existsSync(verifcationKeyPath)) {
        console.log(chalk.red("Missing verification_key.json"))
        console.log("Run", chalk.blue("niftyzk verificationkey [--final]", "to generate a verification key."))
        return;
    }

    if (options.ark) {
        console.log("generating ark")
        generateArkGroth16(verifcationKeyPath, testProofPath);
    } else if (options.bellman) {
        generateBellmanGroth16(verifcationKeyPath, testProofPath);
    }
}

async function generateArkGroth16(verificationKeyPath, testProofPath) {
    const verificationKeyBuff = fs.readFileSync(verificationKeyPath).toString();
    const testProofBuff = fs.readFileSync(testProofPath).toString()

    const verificationKeyString = verificationKeyBuff.toString();
    const testProofString = testProofBuff.toString();
    const testProofJson = JSON.parse(testProofString);
    try {
        console.log("comparing veri")
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

    //    console.log(JSON.stringify(testProofJson.publicSignals))


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

//This does a deep comparason to make sure the tested vkey is the same as the last generated one
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

async function generateBellmanGroth16() {
    console.log("not implemented")
}

module.exports = { genContract }