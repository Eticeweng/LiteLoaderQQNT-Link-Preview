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
	tags = ["title", ["link[rel*=icon]", "href"]]
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
	return extracted.filter((item) => item);
}

function render(node, message, error) {
	if (!node.classList.contains("link-preview-baked")) {
		let baseNode = document.createElement("div");
		if (!error) {
			// 若修改了 fetch 规则请手动修改组装逻辑
			let infoNodes = [
				document.createElement("img"),
				document.createElement("span"),
			];
			infoNodes[0].setAttribute("src", message[1]);
			infoNodes[0].classList.add("link-preview-icon"); // 预设 icon class 可以自定义
			infoNodes[1].innerText = message[0];
			infoNodes.forEach((node) => baseNode.appendChild(node));
			baseNode.classList.add("message-link-preview");
		} else {
			let errorNode = document.createElement("span");
			errorNode.innerText = message;
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
				if (
					mutation.addedNodes[0].parentNode.classList.contains(
						"text-link"
					) &&
					mutation.addedNodes[0].wholeText.startsWith("http")
				) {
					console.log("[link-preview] :target matched");
					let id = await sha1(mutation.addedNodes[0].wholeText);
					let nullableResult = cacheMap.get(id);
					let container = mutation.addedNodes[0].parentNode;
					if (!nullableResult) {
						let turn = await window.link_preview.bakePreview(
							mutation.addedNodes[0].wholeText
						);
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
						render(container, turn.result, turn.error);
						cacheMap.set(id, turn);
					} else {
						console.log(
							"[link-preview] baked-cache:",
							nullableResult.error,
							nullableResult.result
						);
						render(
							container,
							nullableResult.result,
							nullableResult.error
						);
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
		}
	}, 500);
}
