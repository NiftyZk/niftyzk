import { io } from "socket.io-client";



export function connectToSocket(onSuccess, onError, routeMessages) {
    let socket;
    let contributionEndedDisconnect = false;
    let contributionEndedDisconnectMessage = "";
    let contributionEndedInError = false;

    try {
        socket = io({ autoConnect: false })
    } catch (err) {
        onError("Unable to connect to websocket!")
        socket.disconnect();
    }

    socket.on("connect", () => {
        onSuccess("Successfully Connected to the socket. You have been added to a queue!")
    });

    socket.onAny(async (jsonString) => {
        const msg = JSON.parse(jsonString);
        await routeMessages(msg);
    })

    socket.on("disconnect", () => {
        socket.disconnect();
        if (contributionEndedDisconnect) {
            if (contributionEndedInError) {
                onError(contributionEndedDisconnectMessage)
            } else {
                onSuccess(contributionEndedDisconnectMessage)
            }
        } else {
            onError("Connection disconnected!")
        }
    })

    socket.open();



    return {
        disconnect: () => socket.disconnect(),
        uploadFile: (oldFileName, name, data, contributionHash) => {
            socket.emit("upload", { oldFileName, name, data: data.buffer, contributionHash }, (status) => {
                if (status.code === 0) {
                    contributionEndedDisconnectMessage = "Successful contribution. Thank you for supporting decentralization!";
                } else {
                    contributionEndedDisconnectMessage = status.message;
                    contributionEndedInError = true;
                }

                contributionEndedDisconnect = true;
                socket.disconnect();
            })
        }
    };
}

