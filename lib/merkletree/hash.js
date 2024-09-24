const { buildMimc7, buildMimcSponge, buildPoseidon, buildPedersenHash, buildBabyjub } = require("circomlibjs");
const { utils } = require("ffjavascript");
const crypto = require("crypto");

async function hashLeaves(left, right, hashfunc, key) {

    switch (hashfunc) {
        case "mimc7":
            return await hashWithMimc7(left, right, key);
        case "mimcsponge":
            return await hashWithMimcSponge(left, right, key);
        case "pedersen":
            return await hashWithPedersen(left, right);
        case "poseidon":
            return await hashWithPoseion(left, right)
        default:
            throw new Error("Unimplemented hash function")
    }
}

async function pedersen(buff) {
    const hasher = await buildPedersenHash();
    const babyJub = await buildBabyjub();
    const hashBytes = hasher.hash(buff);
    const unpack = babyJub.unpackPoint(hashBytes);
    const hash = babyJub.F.toString(unpack[0]);
    return BigInt(hash);
}

async function poseidon(args) {
    const hasher = await buildPoseidon();
    const hashBytes = hasher(args);
    const hash = hasher.F.toString(hashBytes);
    return BigInt(hash)
}

async function mimc7(arr, key) {
    const hasher = await buildMimc7();
    const hashBytes = hasher.multiHash(arr, key);
    const hash = hasher.F.toString(hashBytes);
    return BigInt(hash);
}

async function mimcSponge(arr, key) {
    const hasher = await buildMimcSponge();
    const hashBytes = hasher.multiHash(arr, key, 1);
    const hash = hasher.F.toString(hashBytes);
    return BigInt(hash);
}

async function hashWithPedersen(left, right) {
    const buff = Buffer.concat([utils.leInt2Buff(left, 31), utils.leInt2Buff(right, 31)]);
    return await pedersen(buff)
}

async function hashWithPoseion(left, right) {
    return await poseidon([BigInt(left), BigInt(right)]);
}

async function hashWithMimc7(left, right, key) {
    return await mimc7([BigInt(left), BigInt(right)], key)
}

async function hashWithMimcSponge(left, right, key) {
    return await mimcSponge([BigInt(left), BigInt(right)], key)
}

function rbigint() {
    return utils.leBuff2int(crypto.randomBytes(31));
}


module.exports = { hashLeaves, rbigint }