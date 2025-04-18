const readmefile = {
    name: "readme.md", content: () => `# NiftyZK CLI
**Scaffold a new Circom project, generate circuits, compile it and run Powers of Tau Phase-2 ceremonies. Generate a cosmwasm verifier contract. Supports Groth-16 with a BN128 curve**

## Dependencies

The application requires Rust, Circom and Nodejs to be installed.

Follow the installation guide for Circom
https://docs.circom.io/getting-started/installation/

# Features

This is a command line toolkit for developers starting out using circom and writing contracts for the cosmos ecosystem. 

It currently supports groth16 proving system with a BN128 curve and generates 2 cosmwasm contracts contracts. One with the Arkworks Groth16 Rust dependency, the other using Bellman, the fork maintained by DoraFactory.
Using the Bellman based contract requires an adapter for the verification key and proofs, which will be auto generated for you.

# Commands

\`niftyzk help\`  - Display the help text

\`niftyzk init [projectname]\` - Run the initialization script to initialize a new project or add the dependencies to an existing local package.json if you omit the projectname.
The dependencies for the project are circomlib, circomlibjs,ffjavascript and snarkjs. Tests are ran using Jest.

\`niftyzk ptaufiles\` - Display information and download powers of tau files. The files were created as a phase 1 ceremony for Polygon Hermez and more information can be found about them in the Snarkjs repository.
A ptau file is required to compile circuits and proceed with the phase2 ceremony which is circuit specific. Not all downloadable files are compatible with the built in phase-2 ceremony due to their size. Never commit your ptau files, instead download them each time you use the project.

\`niftyzk gencircuit\` - Generate the circom circuit with the option to add extra parameters. This will scaffold a circuit with a commitment reveal scheme using 2 secret inputs,\`secret and nullifier\` and public inputs \`nullifierHash and commitmentHash\`. The circuit was developed for on-chain use, where the knowledge of the commitmentHash preimage is proven using a zkSnark, while the nullifierHash is used for avoiding proof replay. Different nullification strategies could be also used. You are free to edit the circuits.
The extra parameters added will be used in hidden signals in the proof, to create tamper proof inputs, for example a withdrawal address. This makes the functions consuming zksnarks front run resistant.

\`niftyzk dev\` - Start the hot reload for development. The input for the circuit is implemented in /test/input.js. Each time the circuit file is updated the hot reload will rerun it using a new input. To assert the output of the circuit, implement getOutput function in the /test/input.js file and run the command with --assertout

\`niftyzk compile\` - Compiles the circuits using circom with a BN128 curve and prepares the project for the phase-2 ceremony. The compiled circuit path defaults to circuit.circom but can be changed using the --circuit [path] flag.
After compilation, you can jump to creating the verification key and generating a contract for development or proceed with the phase-2 ceremony, after which the circuits can't be changed again.


\`niftyzk ceremony\` - Run a phase2 ceremony server for the circom curcuits. It supports groth-16 proving system. The CLI contains a server that serves a webpage that allows for contributions. The project can be deployed on a VPS to host a ceremony. The server supports 25 simultaneous contributions in a queue. The contributions are anonymous, each contributor can verify their contributions by downloading the log file and comparing the entries with the sha256sum of the name they entered.

\`niftyzk finalize --beacon[string] --iter[num] --name[string]\` - Run the finalization of the zkeys, after the phase2 ceremony has been finished. The --beacon flag is required. It must be a valid hexadecimal sequence, without 0x prefix. The --name is required, it's the name of the final contribution. The --iter flag is the number of iterations, defaults to 10. Finalize will output a final.zkey which contains the phase-2 contributions and can be used to generate the verification key.

\`niftyzk vkey --final\` - Get the verification key from the zkey. When omitting the final flag, the  0000.zkey will be used, this is handy when developing and iterating on ideas. To create the verification_key.json from the finalized zkey, use the --final flag.

\`npm run test\` - You must run the scaffolded tests to proceed before generating the contracts. The tests output test proofs used for generating tests in Rust for the contracts. When developing circom circuits, always make sure the tests pass and output the required file.

\`niftyzk gencontract --bellman --ark --overwrite --folder[string] --circuit \` - Generate cosmwasm smart contract for verifying the zkp
The libraries used for generating the contracts are either --bellman or --ark . 
Specify the directory for the contracts using the --folder flag. When using the same folder, the project will be overwritten completely and so you must explicitly allow it using the --overwrite flag. 
If you developed a custom cosmwasm contract but want to generate a new one with a new key, always use a different folder and then merge them manually!
If your compiled circom circuit's name is not circuit.circom, specify it using the --circuit flag


## Checking the generated contracts
Install the wasm rust compiler backend:
\`rustup target add wasm32-unknown-unknown\`

Run \`cargo test\` to run the generated tests

Build the contracts using \`cargo wasm\`

Verify the contract.wasm using the cosmwasm-check utility
\`cargo install cosmwasm-check\`

\`cosmwasm-check ./target/wasm32-unknown-unknown/release/contract.wasm\`


`}

module.exports = { readmefile }