# LiteLoaderQQNT-Link-Preview  
为聊天区域中的所有链接添加其网页标题和图标  
适用于所有`http`或`https`协议的链接  
![image](https://github.com/Eticeweng/LiteLoaderQQNT-Link-Preview/assets/43090280/397cfb17-7fb8-4ea1-b5c7-89645ee47d2d)

### 样式  
上面截图中的为默认样式  
可以通过css自定义默认样式  
正常读取的链接样式的class为`message-link-previewr`  
读取失败的链接样式的class为`message-link-preview__error`  

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
