const fs = require("fs");
const circom_tester = require("circom_tester");
const wasm_tester = circom_tester.wasm;
const path = require("path")

async function hotReload(circuit, assertOut, verbose) {

    let MAIN = "circuit.circom";

    if (circuit) {
        MAIN = circuit;
    }

    let TESTING = false;

    async function testCircuit(filename) {
        if (TESTING) {
            return;
        }

        if (!filename.endsWith(".circom")) {
            return;
        }

        TESTING = true;
        try {
            console.log(`Running wasm_tester`)

            const circuitPath = path.join(process.cwd(), "circuits", MAIN);
            if (verbose) {
                console.log("Circuit Path", circuitPath)
            }
            const circuit = await wasm_tester(circuitPath);

            let myModule;
            const modulePath = path.join(process.cwd(), "test", "input.js");
            if (verbose) {
                console.log("Input script:", modulePath)
            }
            await import(modulePath).then(module => { myModule = module });

            const input = await myModule.getInput()

            if (verbose) {
                console.log("Input:", input)
            }

            const witness = await circuit.calculateWitness(input, true);

            await circuit.checkConstraints(witness);

            if (assertOut) {
                const output = await myModule.getOutput();

                if (verbose) {
                    console.log("Expected Output:", output);
                }
                await circuit.assertOut(witness, output);
            }

        } catch (err) {
            console.log(err)
        } finally {
            setTimeout(() => { TESTING = false }, 100);
        }

    }

    await testCircuit(MAIN);
    console.log("Watching circuits for changes")
    fs.watch(path.join(process.cwd(), "circuits"), async (eventType, filename) => {
        await testCircuit(filename)
    })


}

module.exports = { hotReload }