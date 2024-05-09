// 运行在 Electron 主进程 下的插件入口

// 创建窗口时触发
const { app, ipcMain, dialog } = require("electron");

// const patchedPage = [
//     "#/main/message",
//     "#/chat",
//     "#/forward",
//     "#/record"
// ]

module.exports.onBrowserWindowCreated = (window) => {
	// window 为 Electron 的 BrowserWindow 实例
};

const STANDARD_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};
async function fetchSegment(url) {
	const controller = new AbortController();
	CUSTOM_LOG("about to fetch", url);
	let pendingFetch = await fetch(url, {
		headers: STANDARD_HEADERS,
		signal: controller.signal,
	})
		.then((response) => response.body)
		.then(async (body) => {
			const reader = body.getReader();
			const textDecoder = new TextDecoder();
			let read = "";
			let receivedLength = 0;
			return await reader.read().then(function _innerRead_({ done, value }) {
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
				if (!read.startsWith("<!DOCTYPE html>")) {
					controller.abort();
					CUSTOM_LOG(
						":endpoint not standard HTML, aborting",
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
		.catch(err => ({
			error: true,
			code: "FETCH_API_ERROR",
		}));
		return pendingFetch;
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
