// 运行在 Electron 渲染进程 下的页面脚本
function debounce(fn, time) {
	let timer = null;
	return function (...args) {
		timer && clearTimeout(timer);
		timer = setTimeout(() => {
			fn.apply(this, args);
		}, time);
	};
}

function htmlParser(htmlString, format = "text/html") {
	let parser = new DOMParser();
	return parser.parseFromString(htmlString, format);
}

// fetch head 里面的属性与文本 默认提取 title 和 icon 地址
function extractContent(
	domObject,
	tags = ["title", ["link[rel~=icon]", "href"]]
) {
	if (!domObject) {
		return undefined;
	}
	let target = domObject.querySelector("head");
	let extracted = tags.map((tag) => {
		let nullableNode;
		let attrMark = Object.prototype.toString.call(tag).endsWith("Array]");
		if (attrMark) {
			nullableNode = target.querySelector(tag[0]);
		} else {
			nullableNode = target.querySelector(tag);
		}
		if (!nullableNode) {
			return null;
		}
		return attrMark
			? nullableNode.getAttribute(tag[1])
			: nullableNode.textContent;
	});
	return extracted;
}

const ERROR_CODE_MAP = {
	FETCHED: "读取完毕",
	FINISH_READING: "读取完毕但未找到信息",
	NON_STANDARD_HTML: "非标准HTML页面",
	FETCH_API_ERROR: "FetchAPI错误",
};

function render(node, info) {
	if (!node.classList.contains("link-preview-baked")) {
		let baseNode = document.createElement("div");
		if (!info.error) {
			// 若修改了 fetch 规则请手动修改组装逻辑
			let infoNodes = [
				document.createElement("img"),
				document.createElement("span"),
			];
			if (info.result[1]) {
				infoNodes[0].setAttribute(
					"src",
					info.result[1].startsWith("http") ||
						info.result[1].startsWith("data")
						? info.result[1]
						: `${info._url.origin}${
								info.result[1].startsWith("/")
									? info.result[1]
									: `/${info.result[1]}`
						  }`
				);
			}
			infoNodes[0].classList.add("link-preview-icon"); // 预设 icon class 可以自定义
			infoNodes[1].innerText = info.result[0] || "[读取不到标题]";
			infoNodes.forEach((node) => baseNode.appendChild(node));
			baseNode.classList.add("message-link-preview");
		} else {
			let errorNode = document.createElement("span");
			errorNode.innerText = ERROR_CODE_MAP[info.code];
			baseNode.appendChild(errorNode);
			baseNode.classList.add("message-link-preview__error");
		}
		node.appendChild(baseNode);
		node.classList.add("link-preview-baked");
	}
}

async function sha1(message) {
	return Array.from(
		new Uint8Array(
			await crypto.subtle.digest(
				"sha-1",
				new TextEncoder().encode(message)
			)
		)
	)
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

const STYLE_ID = "link-preview";
function patchCSS() {
	let cssNode = document.querySelector(`html > head > style[id=${STYLE_ID}]`);
	if (cssNode) {
		cssNode.parentNode.removeChild(cssNode);
	}
	let cssPatch = document.createElement("style");
	cssPatch.setAttribute("id", STYLE_ID);
	cssPatch.setAttribute("type", "text/css");
	cssPatch.innerText = `
	div.message-link-preview,
	div.message-link-preview__error {
		font-size: 12px;
		display: inline-flex;
		align-items: center;
		user-select: none;
		background-color: black;
		border-radius: 8px;
		padding-top: 2px;
		padding-right: 2px;
		padding-left: 8px;
		padding-right: 8px;
	}
	div.message-link-preview__error {
		color: #ffa4a4;
	}
	img.link-preview-icon {
		height: 15px;
		width: 15px;
		margin-right: 3px;
	}
	span.link-preview-baked:hover > div.message-link-preview,
	span.link-preview-baked:hover > div.message-link-preview__error {
		filter: brightness(1.5);
	}`.replaceAll(/\s/g, "");
	document.querySelector("html > head").appendChild(cssPatch);
}

let fetching = new Set();
let cacheMap = new Map();
async function loadPreview(url, container) {
	let id = await sha1(url);
	let nullableResult = cacheMap.get(id);
	if (!nullableResult) {
		if (fetching.has(id)) {
			return;
		}
		fetching.add(id);
		let turn = await window.link_preview.bakePreview(url);
		fetching.delete(id);
		turn._url = new URL(url);
		if (!turn.error) {
			turn.result = extractContent(htmlParser(turn.result));
			CUSTOM_LOG("baked:", turn.result);
		} else {
			CUSTOM_LOG("error:", turn.code);
		}
		try {
			render(container, turn);
		} catch (e) {
		} finally {
			if (cacheMap.size >= 100) {
				cacheMap.clear();
			}
			cacheMap.set(id, turn);
		}
		CUSTOM_LOG("now cached", cacheMap.size);
	} else {
		// if (nullableResult.error) {
		// 	CUSTOM_LOG("baked-error:", nullableResult.code);
		// } else {
		// 	CUSTOM_LOG(
		// 		"baked-cache:",
		// 		nullableResult.error,
		// 		nullableResult.result
		// 	);
		// }
		render(container, nullableResult);
	}
}
onLoad();

// todo: debug
// Object.defineProperty(window, "lpDebug", {
// 	value: cacheMap,
// 	writable: false
// });

async function onLoad() {
	const observer = new MutationObserver(async (mutationsList) => {
		for (let mutation of mutationsList) {
			if (
				mutation.type === "childList" &&
				mutation.addedNodes.length > 0 &&
				mutation.addedNodes !== null &&
				Object.prototype.toString
					.call(mutation.addedNodes[0])
					.endsWith("Text]")
			) {
				let url = mutation.addedNodes[0].wholeText;
				if (
					mutation.addedNodes[0].parentNode.classList.contains(
						"text-link"
					) &&
					url.startsWith("http")
				) {
					loadPreview(url, mutation.addedNodes[0].parentNode);
				}
			}
		}
	});
	let loopFinder = setInterval(() => {
		let targetNode = document.querySelector(".ml-list.list");
		if (targetNode !== null) {
			CUSTOM_LOG("chat area loaded and injected");
			observer.observe(document.querySelector(".ml-list.list"), {
				attributes: false,
				childList: true,
				subtree: true,
			});
			clearInterval(loopFinder);
			patchCSS();
		}
	}, 500);
}

function CUSTOM_LOG(...content) {
	console.log("[Link-Preview]", ...content);
}
