Nifty Bundles - Scaffolding tool for circom circuits using a fixed sized merkle tree

[] TODO: Maybe I just use javascript instead of TS and use jsDoc for some typed imports

Goals:

[] - A Nodejs application CLI devtool
[] - Initialization:  bundles init
[] - Check for dependencies and install them
[] - Download Ptau files
[] - Ask the user to enter bundle name
[] - Ask the user to enter public inputs for integrity checks
[] - Ask the user for the size of the merkle tree
[] - Crypto note format, regex, parser, generate
[] - Output a json file with the parameters
[] - output to a folder /niftybundles the generated circom circuit, javascript code
[] - output the generated circom file
[] - compile the circuit
[] - calculate the witness
[] - get the zkey
[] - generate a server code to host the phase2 ceremony
[] - generate a relayer node
[] - a CLI command to generate the crypto notes and merkle tree
[] - optional -qrcodes argument to generate qrcodes when generating
[] - generate a solidity verifier using snarkjs
[] - generate a cosmwasm verifier contract
[] - finalize the circuit from the phase2 ceremony
