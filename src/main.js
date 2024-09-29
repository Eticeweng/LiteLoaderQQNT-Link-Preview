// 运行在 Electron 主进程 下的插件入口

// 创建窗口时触发
const {app, ipcMain, dialog} = require("electron");

// const patchedPage = [
//     "#/main/message",
//     "#/chat",
//     "#/forward",
//     "#/record"
// ]
module.exports.onBrowserWindowCreated = async (window) => {
    // window 为 Electron 的 BrowserWindow 实例
};

const DEFAULT_CONFIG = {
    timeout_second_input: 10000
};


const STANDARD_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};
const MARK = ["<html>", "<!DOCTYPE html"];

async function fetchSegment(url) {
    const controller = new AbortController();
    const config = await LiteLoader.api.config.get("link_preview", DEFAULT_CONFIG)
    let isTimeout = false;
    let fetchTimeoutHanlde = setTimeout(() => {
        isTimeout = true;
        controller.abort();
    }, +config.timeout_second_input);
    return await fetch(url, {
        headers: STANDARD_HEADERS,
        signal: controller.signal,
    })
        .then((response) => {
            clearTimeout(fetchTimeoutHanlde);
            return response.body;
        })
        .then(async (body) => {
            const reader = body.getReader();
            const textDecoder = new TextDecoder();
            let read = "";
            let receivedLength = 0;
            return await reader.read().then(function _innerRead_({done, value}) {
                if (done) {
                    CUSTOM_LOG(":reading is done", receivedLength);
                    return {
                        error: true,
                        code: "FINISH_READING",
                        receivedLength,
                    };
                }
                read += textDecoder.decode(value);
                receivedLength += value.length;
                let trimmedRead = read.trimStart();
                let valid = MARK.find(mark => trimmedRead.startsWith(mark));
                if (!valid) {
                    controller.abort();
                    CUSTOM_LOG(
                        url, ":endpoint not standard HTML, aborting",
                        receivedLength
                    );
                    return {
                        error: true,
                        code: "NON_STANDARD_HTML",
                        receivedLength,
                    };
                }
                if (read.lastIndexOf("</head>") > -1) {
                    controller.abort();
                    CUSTOM_LOG(":endpoint reached, aborting", receivedLength);
                    return {
                        error: false,
                        code: "FETCHED",
                        receivedLength,
                        result: read,
                    };
                }
                return reader.read().then(_innerRead_);
            });
        })
        .catch(err => {
            CUSTOM_LOG(err);
            return ({
                error: true,
                code: "FETCH_API_ERROR",
                reason: isTimeout ? "超时" : err.toString()
            });
        });
}

onLoad();

async function onLoad() {
    ipcMain.handle(
        "LiteLoader.link_preview.bakePreview",
        async (event, chunk) => {
            return await fetchSegment(chunk);
        }
    );
}

function CUSTOM_LOG(...content) {
    console.log("[Link-Preview]", ...content);
}
