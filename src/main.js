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
	window.webContents.on("did-stop-loading", () => {
		console.log("launched");
	});
};

const STANDARD_HEADERS = {
	"User-Agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};
async function fetchSegment(url) {
	const controller = new AbortController();
	return await fetch(url, {
		headers: STANDARD_HEADERS,
		signal: controller.signal,
	})
		.then((response) => response.body)
		.then(async (body) => {
			const reader = body.getReader();
			const textDecoder = new TextDecoder();
			let read = "";
			let receivedLength = 0;
			await reader.read().then(function _innerRead_({ done, value }) {
				if (done) {
					console.log(":reading is done", receivedLength);
					return;
				}
				console.log(":reading", receivedLength);
				read += textDecoder.decode(value);
				receivedLength += value.length;
				if (read.lastIndexOf("</head>") > -1) {
					controller.abort({ read, receivedLength });
					console.log(":endpoint reached, aborting", receivedLength);
					return;
				}
				return reader.read().then(_innerRead_);
			});
			return read;
		})
		.then((r) => {
			return { error: false, result: r };
		})
		.catch((err) => {
			return { error: true, result: err };
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
