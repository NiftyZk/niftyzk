const getApp = require('./app');
const debug = require('debug')('phase2Ceremony');
const http = require('http');

const { onConnect } = require("./websockets");
const { detectFile, createLogIfNotExists } = require('./files');
const chalk = require('chalk');

function runServer() {
    const app = getApp()
    /**
     * Check if the required files exist in the filesystem
     */

    detectFile("ptau", (msg) => console.log(`.ptau file: OK`));
    detectFile("r1cs", (msg) => console.log("r1cs file: OK "));
    detectFile("zkey", (msg) => console.log("zkeys: OK"));
    createLogIfNotExists()
    /**
     * Event listener for HTTP server "listening" event.
     */

    function onListening() {
        var addr = server.address();
        var bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;
        debug('Listening on ' + bind);
    }

    /**
     * Get port from environment and store in Express.
     */

    const port = normalizePort(process.env.PORT || '3000');
    app.set('port', port);
    console.log(chalk.blue("Starting ceremony server on port"), port)

    /**
     * Create HTTP server.
     */

    const server = http.createServer(app);

    /**
     * Listen on provided port, on all network interfaces.
     */

    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);

    const io = require('socket.io')(server, { maxHttpBufferSize: 1e8 });

    io.on("connection", (socket) => onConnect(io, socket))
    /**
     * Normalize a port into a number, string, or false.
     */

    function normalizePort(val) {
        var port = parseInt(val, 10);

        if (isNaN(port)) {
            // named pipe
            return val;
        }

        if (port >= 0) {
            // port number
            return port;
        }

        return false;
    }

    /**
     * Event listener for HTTP server "error" event.
     */

    function onError(error) {
        if (error.syscall !== 'listen') {
            throw error;
        }

        var bind = typeof port === 'string'
            ? 'Pipe ' + port
            : 'Port ' + port;

        // handle specific listen errors with friendly messages
        switch (error.code) {
            case 'EACCES':
                console.error(bind + ' requires elevated privileges');
                process.exit(1);
                break;
            case 'EADDRINUSE':
                console.error(bind + ' is already in use');
                process.exit(1);
                break;
            default:
                throw error;
        }
    }


}

module.exports = { runServer }