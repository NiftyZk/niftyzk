const fs = require("fs");
const path = require("path");
const { PTAUFILESDIR, COMPILEDDIR } = require("../paths");
const { verify } = require("./verify")

const ZKEYSDIR = path.join(process.cwd(), "circuits", "compiled", "zkeys")
const LOGSDIR = path.join(process.cwd(), "circuits", "compiled", "contributions");



function getLatest(onSuccess) {
    let fileNameIdArray = [];
    fs.readdir(ZKEYSDIR, (err, files) => {
        files.forEach(file => {
            const getId = parseFileName(file)
            fileNameIdArray.push(getId);
        })
        findLatestFile(fileNameIdArray, onSuccess)
    })
}

function findLatestFile(array, onSuccess) {
    let latestId = 0;
    let latestName = "";

    for (let i = 0; i < array.length; i++) {
        const id = array[i].id;
        if (parseInt(id) >= latestId) {
            latestId = id;
            latestName = array[i].fileName;
        }
    }

    onSuccess(latestName);
}


function parseFileName(fileName) {
    const filenameRegex = /(?<name>\w+)_(?<id>[\d.]+).zkey/g;
    const match = filenameRegex.exec(fileName);
    if (!match) {
        throw new Error("Invalid FileName");
    }

    return { id: match.groups.id, fileName, name: match.groups.name }
}

function createNewFileName({ id, name }) {
    const incrementId = parseInt(id) + 1;
    const idString = incrementId.toString();
    // Pad the id to be 4 digits
    let zeroes = "";
    for (let i = idString.length; i < 4; i++) {
        zeroes += "0";
    }
    const paddedId = zeroes + idString;
    const newFileName = `${name}_${paddedId}.zkey`;
    return newFileName;
}

// save the file to the files directory
async function writeFile(oldFileName, data, callback, contributorName, contributionHash) {
    // Verify the file here before I attempt to write it!
    const { valid } = await verify(data, detectFile);
    if (!valid) {
        callback({ message: "Invalid Contribution!", code: 1 });
        return;
    }
    // First I do a check and get the latest
    const parsed = parseFileName(oldFileName);
    const newFileName = createNewFileName(parsed);

    getLatest((filename) => {
        if (oldFileName !== filename) {
            callback({ message: "zkey ordering failed", code: 1 })
            return;
        }
        const filePath = `${ZKEYSDIR}/${newFileName}`

        fs.open(filePath, "w", (err, fd) => {
            // File should be missing
            fs.writeFile(filePath, data, (err) => {
                if (err) {
                    callback({ message: "saving the file failed!", code: 1 })
                    closeFd(fd);
                } else {
                    // Log the file writing
                    writeLog("Contribution", contributorName, contributionHash, newFileName)
                    closeFd(fd)
                    callback({ message: "success", code: 0 })
                }
            })
        })
    })
}

function writeLog(type, contributorName, contributionHash, fileName) {
    const path = `${LOGSDIR}/log.csv`;
    appendLogLine(
        path,
        type,
        contributorName,
        contributionHash,
        fileName);
}

function appendLogLine(path, type, contributorName, contributionHash, fileName) {
    fs.open(path, 'a', (err, fd) => {

        if (err) {
            console.error("Log file missing");
            closeFd(fd);
            // If logging failed, still let it gracefully continue
            return;
        };
        fs.appendFile(fd, `${type},${contributorName},${contributionHash},${fileName}\n`, "utf-8", (err) => {
            // If logging failed, still let it gracefully continue
            if (err) {
                console.error(err);
            }
            closeFd(fd)
        });
    });
}

function createLogIfNotExists() {
    const path = `${LOGSDIR}/log.csv`;
    const csvFirstLine = `type,name,contributionHash,fileName\n`
    fs.open(path, 'wx', (err, fd) => {
        if (err) {
            if (err.code === 'EEXIST') {
                console.log('Writing to an existing log file');
                return;
            }

            throw err;
        }

        fs.writeFile(path, csvFirstLine, "utf-8", (err) => {
            if (err) {
                console.error("Cannot create log file")
            } else {
                console.log("Created a new log file")
            }

            closeFd(fd);

        })
    });
}

function detectFile(extension, getResult) {
    // use this function to detect if the required files exist
    // and get their name
    if (extension === "ptau") {
        fs.readdir(PTAUFILESDIR, (err, files) => {
            if (err) {
                throw err;
            }

            let ptauFiles = [];

            files.forEach(file => {
                if (file.includes(".ptau")) {
                    ptauFiles.push(file);
                }
            })

            if (ptauFiles.length === 0) {
                throw new Error("Unable to find .ptau files!");
            }

            if (ptauFiles.length > 1) {
                throw new Error("Found more than 1 .ptau files!");
            }
            getResult(`${PTAUFILESDIR}/${ptauFiles[0]}`);
        })

    } else if (extension === "r1cs") {
        fs.readdir(COMPILEDDIR, (err, files) => {
            if (err) {
                throw err;
            }

            let r1csFiles = [];

            files.forEach(file => {
                if (file.includes(".r1cs")) {
                    r1csFiles.push(file)
                }
            })

            if (r1csFiles.length === 0) {
                throw new Error("Unable to find .r1cs files!")
            }

            if (r1csFiles.length > 1) {
                throw new Error("Found more than 1 .r1cs file!");
            }
            getResult(`${COMPILEDDIR}/${r1csFiles[0]}`);
        })


    } else if (extension === "zkey") {
        fs.readdir(ZKEYSDIR, (err, files) => {
            if (err) {
                throw err;
            }

            let zkeyFiles = [];

            files.forEach(file => {
                if (file.includes(".zkey")) {
                    zkeyFiles.push(file);
                }
            });

            if (zkeyFiles.length === 0) {
                throw new Error("Unable to find a .zkey file! You need to put at least 1 in a ./zkeys directory ")
            }

            getResult(zkeyFiles[0]);
        })
    }
}


/*
Cleanup. Close the file descriptor
*/
function closeFd(fd) {
    fs.close(fd, (err) => {
        if (err) throw err;
    });
}

module.exports = { getLatest, writeFile, writeLog, detectFile, createLogIfNotExists,parseFileName };