# LiteLoaderQQNT-Link-Preview  
为聊天区域中的所有链接添加其网页标题和图标  
适用于所有`http`或`https`协议的链接  
能否读取成功也会受到用户身处的网络环境影响，此插件会跟随QQ的代理设置  
![{1E1A5269-A376-4d1c-B8DE-C6CA7612C804}](https://github.com/Eticeweng/LiteLoaderQQNT-Link-Preview/assets/43090280/0a4a4b7e-f43e-4a76-94e1-6f152e6c8610)

### 样式  
截图中的为默认样式  
可以通过css修改默认样式  
正常读取的链接样式的class为`message-link-previewr`  
读取失败的链接样式的class为`message-link-preview__error`  

> (可选) 应用以下样式可以变得更美观（大概）
```css
span.link-preview-baked:hover > div.message-link-preview,
span.link-preview-baked:hover > div.message-link-preview__error {
	filter: brightness(1.5);
}
div.message-link-preview,
div.message-link-preview__error {
	font-family: system-ui !important;
	background-color: #391452 !important;
	padding: 1px 8px !important;
}
div.message-link-preview__error {
	color: #ffa4a4 !important;
}
span.link-preview-baked > div.message-link-preview > img {
	border-radius: 5px;
	flex-shrink: 0;
	filter: drop-shadow(0px 0px 3px);
	scale: 120%;
	margin-right: 5px;
}
```
![{76E5AE33-DD87-4621-B54F-0CC8F25207F8}](https://github.com/Eticeweng/LiteLoaderQQNT-Link-Preview/assets/43090280/1474f685-f14c-45a3-a99a-bd65997dc92a)  

### 缓存
本插件会缓存读取结果，最大上限100条，且会在重启和到达上限时的时候清空  

### 自定义抓取
可到`renderer.js`中的`extractContent`的`tags`中自定义要抓取的`<head>`标签中的数据  
抓取规则需要传入符合`document.querySelector`要求的选择器  
若直接读取标签内文字(`innerText`)请直接传入  
若需要读取属性(`getAttribute`)请传入以下形态的数组  
`['fatherSelector', 'attributeName']`  
这样的话，解析器就会且只会读取符合`fatherSelector`下第一个匹配元素的匹配属性的值了  
**渲染组装器不会自动识别抓取的元素**  
**若想显示对应抓取的数据请到`renderer.js`中的`render`函数中自定义渲染组装逻辑**
