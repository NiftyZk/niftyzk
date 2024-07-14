const express = require("express")
const path = require("path")
const cookieParser = require("cookie-parser")
const logger = require("morgan")
const cors = require("cors")
const fs = require("fs");
const { LOGSDIR, ZKEYSDIR } = require("../paths")

function getApp() {

    const app = express();

    if (!fs.existsSync(LOGSDIR)) {
        fs.mkdirSync(LOGSDIR)
    }

    app.use(cors());
    app.options("*", cors())
    app.use(logger("dev"))
    app.use(express.json())
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser())

    app.use("/zkeys", express.static(ZKEYSDIR))
    app.use("/log", express.static(LOGSDIR, { index: "log.csv" }))

    app.use(express.static(path.join(__dirname, "public")))
    return app;
}

module.exports = getApp;