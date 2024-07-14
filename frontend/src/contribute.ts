async function contribute(oldFileName, newFileName, name, entropy) {
    //@ts-ignore
    const contributionHash = await snarkjs.zKey.contribute(oldFileName, newFileName, name, entropy);
    return bufferToHex(contributionHash);
}

function getFileFullPath(fileName) {
    return window.location.href + "zkeys/" + fileName;
}

export async function contributeWithMemfile(fileName, name, entropy) {
    const memFile: { type: "mem", data: undefined | Uint8Array } = { type: "mem", data: undefined };
    const oldFileName = getFileFullPath(fileName);

    const contributionHash = await contribute(oldFileName, memFile, name, entropy);

    return { newFile: memFile, contributionHash };

}

function bufferToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}