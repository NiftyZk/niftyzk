const connectionList = [];
const MAXCONNECTIONS = 25;
const processing = {
    currently: ""
}

function getProcessingCurrently() {
    return processing.currently;
}

function setProcessingCurrently(to) {
    processing.currently = to;
}


function addConnecton(socketId) {
    // Do not allow more than 25 connections
    if (connectionList.length + 1 > MAXCONNECTIONS) {
        throw new Error("Too many connections. Try again later.")
    }
    connectionList.push(socketId);
}

function removeConnection(socketId) {
    const index = connectionList.indexOf(socketId);
    if (index > -1) { // only splice array when item is found
        connectionList.splice(index, 1); // 2nd parameter means remove one item only
    }
}

function myPosition(socketId) {
    return connectionList.indexOf(socketId) + 1;
}

function getConnectionList() {
    return connectionList;
}

function getFirst() {
    return connectionList[0];
}

module.exports = { addConnecton, removeConnection, myPosition, getConnectionList, getFirst, getProcessingCurrently, setProcessingCurrently }