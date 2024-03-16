// 运行在 Electron 渲染进程 下的页面脚本

// 打开设置界面时触发
export const onSettingWindowCreated = (view) => {
	// view 为 Element 对象，修改将同步到插件设置界面
};

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
					info.result[1].startsWith("http") || info.result[1].startsWith("data")
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
			errorNode.innerText = info.result;
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
	.message-link-preview,
	.message-link-preview__error {
		font-size: 12px;
		display: inline-flex;
		align-items: center;
		user-select: none;
		background-color: black;
		border-radius: 8px;
		padding: 0 8px;
	}
	.message-link-preview__error {
		color: red;
	}
	.link-preview-icon {
		height: 15px;
		width: 15px;
		margin-right: 3px;
	}`;
	document.querySelector("html > head").appendChild(cssPatch);
}

let cacheMap = new Map();
onLoad();

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
					console.log("[link-preview] :target matched");
					let id = await sha1(url);
					let nullableResult = cacheMap.get(id);
					let container = mutation.addedNodes[0].parentNode;
					if (!nullableResult) {
						let turn = await window.link_preview.bakePreview(url);
						turn._url = new URL(url);
						if (!turn.error) {
							turn.result = extractContent(
								htmlParser(turn.result)
							);
							console.log("[link-preview] baked:", turn.result);
							console.log(
								"[link-preview] :now cached",
								cacheMap.size
							);
							if (cacheMap.size >= 100) {
								cacheMap.clear();
							}
						} else {
							console.log("[link-preview] error:", turn.result);
						}
						render(container, turn);
						cacheMap.set(id, turn);
					} else {
						console.log(
							"[link-preview] baked-cache:",
							nullableResult.error,
							nullableResult.result
						);
						render(container, nullableResult);
					}
				}
			}
		}
	});
	let loopFinder = setInterval(() => {
		let targetNode = document.querySelector(".ml-list.list");
		if (targetNode !== null) {
			console.log("[link-preview] :chat area loaded and injected");
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
