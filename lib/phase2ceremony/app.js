const express = require("express")
const path = require("path")
const cookieParser = require("cookie-parser")
const logger = require("morgan")
const cors = require("cors")
const fs = require("fs");
const { LOGSDIR } = require("../paths")
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
//TODO: Need to have a static directory that serves the assets
app.use("/zkeys", express.static(path.join(process.cwd(), "circuits", "compiled", "zkeys")))
app.use("/log", express.static(LOGSDIR))
// app.use(express.static(path.join()))

module.exports = app;