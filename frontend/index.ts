import { connectToSocket } from "./src/websockets";
import { contributeWithMemfile } from "./src/contribute";
import * as cryptoBrowserify from "crypto-browserify";
import buffer from "buffer/";

//@ts-ignore
window.cryptoBrowserify = cryptoBrowserify;

//@ts-ignore
window.Buffer = buffer.Buffer;

const nameInput = document.getElementById("nameInput") as HTMLInputElement;

const enterCeremony = document.getElementById("enterCeremony") as HTMLButtonElement;

const messageDisplay = document.getElementById("messageDisplay") as HTMLDivElement;

function askEntropy() {
    return window.prompt("Enter a random text. (Entropy): ", "");
}

function hashName(name) {
    const { createHash } = cryptoBrowserify;
    return createHash('sha256').update(name).digest('hex');
}

enterCeremony.onclick = async function () {
    hideMessage();
    if (nameInput.value.length <= 1) {
        showErrorMessage("You need to enter a name! At least 2 characters!")
        return;
    }
    const entropy = await askEntropy();

    if (!entropy) {
        showErrorMessage("You need to enter Entropy!")
        return;
    }

    const nameHash = hashName(nameInput.value);

    if (entropy.length < 3) {
        showErrorMessage("Entropy too short");
        return;
    }

    const onSuccess = (msg) => {
        showSuccessMessage(msg)
    }

    const onError = (msg) => {
        showErrorMessage(msg);
    }


    const MessageRoutes = {
        position: "position",
        closeConnection: "closeConnection",
        startContribution: "startContribution"
    }

    let socketFns;

    async function routeMessages(route) {
        switch (route.type) {
            case MessageRoutes.position:
                showSuccessMessage(`You are in a queue. You are ${route.msg.pos} out of ${route.msg.length}. The ceremony will automaticly proceed when it's your turn!`)
                break;
            case MessageRoutes.closeConnection:
                socketFns.disconnect();
                enterCeremony.disabled = false;
                nameInput.disabled = false;
                showErrorMessage(`Connection closed: ${route.msg.reason}`)
                break;
            case MessageRoutes.startContribution:
                showSuccessMessage("Starting contribution!");
                const contribution = await contributeWithMemfile(route.msg.filename, nameHash, entropy).catch(err => {
                    showErrorMessage("Contribution Failed. Reload the Page and Try Again!");
                    socketFns.disconnect();
                });

                if (contribution !== undefined) {
                    const { contributionHash, newFile } = contribution;
                    showSuccessMessage("Uploading contribution....Verifying...");

                    socketFns.uploadFile(
                        route.msg.filename,
                        nameHash,
                        newFile.data,
                        contributionHash);
                }

                break;
            default:
                break;
        }
    }

    socketFns = connectToSocket(onSuccess, onError, routeMessages);

    enterCeremony.disabled = true;
    nameInput.disabled = true;
}


function showSuccessMessage(msg: string) {
    if (messageDisplay.classList.contains("hide")) {
        messageDisplay.classList.remove("hide");
    }
    if (!messageDisplay.classList.contains("show")) {
        messageDisplay.classList.add("show")
    }

    if (messageDisplay.classList.contains("error")) {
        messageDisplay.classList.remove("error");
    }

    if (!messageDisplay.classList.contains("success")) {
        messageDisplay.classList.add("success")
    }


    messageDisplay.innerHTML = msg;
}

function showErrorMessage(msg: string) {
    if (messageDisplay.classList.contains("hide")) {
        messageDisplay.classList.remove("hide");
    }
    if (!messageDisplay.classList.contains("show")) {
        messageDisplay.classList.add("show")
    }

    if (messageDisplay.classList.contains("success")) {
        messageDisplay.classList.remove("success");
    }

    if (!messageDisplay.classList.contains("error")) {
        messageDisplay.classList.add("error");
    }

    messageDisplay.innerHTML = msg;
}

function hideMessage() {
    if (messageDisplay.classList.contains("show")) {
        messageDisplay.classList.remove("show");
    }
    if (!messageDisplay.classList.contains("hide")) {
        messageDisplay.classList.add("hide");
    }
    if (messageDisplay.classList.contains("success")) {
        messageDisplay.classList.remove("success");
    }
    if (messageDisplay.classList.contains("error")) {
        messageDisplay.classList.remove("error");
    }
}