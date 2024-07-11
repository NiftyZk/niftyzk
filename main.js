const { Command } = require("commander");
const figlet = require("figlet");
const { explainPtauFiles, selectPtauFileToDownload } = require("./lib/loaders/ptauLoader")
console.log(figlet.textSync("NiftyBundles"))

const program = new Command();
program.version("0.0.1")
    .description("Bundle future transactions into a fixed size merkle tree for off-chain distribution. Run zkp Ceremonies and generate verifier smart-contracts that validate merkle proofs using zksnarks")
    .name("NiftyBundles")

program
    .command("init")
    .description("Initialize the project, install dependencies, generate a new circom circuit with optional added public inputs and prepare for the circuit specific powers of tau phase-2 ceremony")
    .option("-i, --publicInputs", "Optional public inputs for the circuit, comma separated list", ",")
    .action((str, options) => {
        //Check for a package.json in the local directory or run npm init and create it

        //TODO: Do the initialization and generate the circuit
        //Add new dependencies, circomlibjs, circom, ffjavascript, snarkjs
        //Run npm install
        //Generate the circuit with the specified public inputs
        //Prompt the user to download the .ptau file
        //Prepare for circuit specific ceremony
        console.log("init runs")
    })

program
    .command("ptaufiles")
    .description("Display information about the downloadable ptau files")
    .action(() => {
        explainPtauFiles()
        selectPtauFileToDownload()
    })


program
    .command("ceremony")
    .description("Runs a phase 2 ceremony server that accepts anonymized contributions via a website")
    .option("--ngrok", "Host the server locally using ngrok")
    .option("--port", "The port to host the ceremony")
    .option("--page", "Path to a html component to customize the hosted ceremony page")
    .action(() => {
        //Run the the ceremony server
    })

program.command("finalize")
    .description("Finalize the circuit after the phase2 ceremony is finished")
    .action(() => {
        //Run circom to finalize the circuit
    })

program.command("genbundle")
    .description("Generate a fixed size merkle tree with it's leaves containing the future transactions")
    .option("--parameters", "Extra parameters for the bundle")
    .option("--qrcode", "Generate QRCodes")
    .action(() => {
        //Generate a merkle tree
        //Add the optional parameters
        //Generate the public tree leaves and root that should be shared to compute proofs
        //Generate the secrets contained in the tree
        //Generate QRcodes for the secrets
        //Generate the javascript regex parser for the NiftyBundle
        //Generate a client side dependency to import into a website via a script tag or normal import
    })

program.command("gencontract")
    .description("Generate the cosmwasm or solidity smart contracts to verify the transactions on-chain for the bundle")
    .option("--bundle", "Specify the path of the bundle to generate a smart contract for.")
    .option("--cosmwasm", "Generate a cosmwasm smart contract template")
    .option("--solidity", "Generate a solidity smart contract template")
    .action(() => {
        //Generate the smart contract, this should be rerun when the circuit is finalized always
        //Output the generated contracts
    })

program.parse();