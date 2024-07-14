const { getLatest, writeFile } = require("./files");
const { addConnecton, removeConnection, getConnectionList, myPosition, getFirst, getProcessingCurrently, setProcessingCurrently } = require("./queue");

function onConnect(io, socket) {
    const id = socket.id;
    try {
        addConnecton(id);
    } catch (err) {
        const connectionList = getConnectionList();
        const length = connectionList.length;
        io.to(id).emit(messageRouter(MessageRoutes.closeConnection, { reason: `Maximum (${length}) connections reached. Please wait!` }))
    }

    sendPositionToClients(io);
    processinQueue(io);

    socket.on("disconnect", (reason) => {
        removeConnection(id);
        sendPositionToClients(io);
        processinQueue(io);
    });

    socket.on("upload", async (msg, callback) => {
        const { oldFileName, name, data, contributionHash } = msg;
        // Double check the socket id is the current one
        const currentlyProcessing = getProcessingCurrently();
        if (socket.id !== currentlyProcessing) {
            callback({ message: "Contribution queueing failed. Wrong socket.", code: 1 });
            return;
        }

        await writeFile(oldFileName, data, callback, name, contributionHash);
    })

}

/*
Send the position in the queue to the socket ids
*/
function sendPositionToClients(io) {
    const connectionList = getConnectionList();
    const currentlyProcessing = getProcessingCurrently();
    for (let i = 0; i < connectionList.length; i++) {
        const socketId = connectionList[i];

        if (currentlyProcessing !== socketId) {
            const pos = myPosition(socketId);
            const length = connectionList.length;
            io.to(socketId).emit(messageRouter(MessageRoutes.position, { pos, length }));
        }
    }
}

function processinQueue(io) {
    const firstInQueue = getFirst();

    const currentlyProcessing = getProcessingCurrently();

    // if the current connection is processing the contribution already do nothing!
    if (firstInQueue === currentlyProcessing) {
        return;
    }

    setProcessingCurrently(firstInQueue);
    getLatest((filename) => io.to(firstInQueue).emit(messageRouter(MessageRoutes.startContribution, { filename })));

    // I will disconnect a socket if it's processing for longer than 1 minute as it might be a malicious socket trying to block the queue
    setTimeout(async () => {
        const stillPricessing = getProcessingCurrently() === firstInQueue;

        if (stillPricessing) {
            const sockets = await io.fetchSockets();

            for (let i in sockets) {
                const socket = sockets[i];
                if (socket.id === firstInQueue) {
                    socket.disconnect();
                }
            }
        }
    }, 60000);
}

const MessageRoutes = {
    position: "position",
    closeConnection: "closeConnection",
    startContribution: "startContribution"
}

function messageRouter(type, msg) {
    return JSON.stringify({ type, msg });
}

module.exports = { onConnect }