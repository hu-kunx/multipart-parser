> [RFC2616](https://tools.ietf.org/rfc/rfc6266.txt)
> content-Disposition 不是 http 标准的一部分,但是以广泛实施
> 本文档不适用于Content-Disposition标头通过HTTP传输的有效载荷主体中出现的字段，例如使用媒体类型“ multipart / form-data”（[RFC2388](https://tools.ietf.org/rfc/rfc2388.txt)）时。

>[rfc6266]
> filename 和 filename*的区别在于 "filename*" 允许使用 iso-8859-1 以外的字符 并且"filename*"是新标准优先级更高
> The parameters "filename" and "filename*" differ only in that "filename*" uses the encoding defined in [RFC5987], allowing the use of characters not present in the ISO-8859-1 character set ([ISO-8859-1]).
> [rfc5987]
> 注意：此编码不适用于传输的消息有效负载通过HTTP，例如当使用媒体类型“ multipart / form-data”时（[RFC2388]）
> Note: this encoding does not apply to message payloads transmitted over HTTP, such as when using the media type "multipart/form-data" ([RFC2388]).
> 格式如 title*=UTF-8''%c2%a3%20and%20%e2%82%ac%20rates

content-Disposition 头如果用在下载文件上,经测试:
* Google Chrome 可以不需要设置attachment 会忽略文件名 文件名会是`下载.ext`
* Firefox 可以不需要设置attachment 会忽略文件名 文件名会是`随机英文数字字符.ext`
* safari 需要设置attachment 会忽略文件名 文件名会是`unknown.ext`


关于"multipart/form-data"的规范目前有两个[RFC 2388](https://tools.ietf.org/rfc/rfc2388.txt) 以及[RFC 7578](https://tools.ietf.org/rfc/rfc7578.txt) 前者已被后者淘汰

> 在文件名不可用或无意义或私有的情况下，文件名不是必需的；例如，当使用选择或拖放操作
  或直接从设备流式传输表单数据内容时，可能会导致这种情况。
> The file name isn't mandatory for cases where the file name isn't available or is meaningless or private; this might result, for example, when selection or drag-and-drop is used or when the form data content is streamed directly from a device.

> 文件可能在一个字段出现多个, 也可能以相同的 name 分开

> content-type  默认为"text/plain" 
> 可能会有一个 name 为 _charset_ 的字段表示 默认字符集

不支持除 content-type content-Disposition content-transfer-encoding 的任何字段
>  The multipart/form-data media type does not support any MIME header  fields in parts other than Content-Type, Content-Disposition, and (in limited circumstances) Content-Transfer-Encoding.  Other header fields MUST NOT be included and MUST be ignored.

## 编码优先级
* _charset_ 字段的内容
* <form>元素的 accept-charset值
* document 的字符编码
* utf-8


### content-transfer-encoding
> Previously, it was recommended that senders use a Content-Transfer-Encoding encoding (such as "quoted-printable") for each non-ASCII part of a multipart/form-data body because that would allow use in transports that only support a "7bit" encoding. This use is deprecated for use in contexts that support binary data such as HTTP. Senders SHOULD NOT generate any parts with a Content-Transfer-Encoding header field. Currently, no deployed implementations that send such bodies have been discovered.

在为 text/plain 时 后面可以有一个 charset 字段表示字符编码
```text
--boundary
content-Disposition: form/data name  filename(可选[在传输文件时也是可选的]) filename*(可选[rfc5987的编码])
content-type: text/plain; charset=UTF-8
content-transfer-encoding: quoted-printable ([rfc7578]不建议使用4.7)
--boundary--

```

关于 "content-Disposition" filename 和 filename* `title*=us-ascii'en-us'This%20is%20%2A%2A%2Afun%2A%2A%2A`

> 字段名称可以是任意的Unicode字符串。但是，将字段名称限制为ASCII
> As with other multipart types, the parts are delimited with a boundary delimiter, constructed using CRLF, "--", and the value of the "boundary" parameter.  
> CR：Carriage Return，对应ASCII中转义字符\r，表示回车 LF：Linefeed，对应ASCII中转义字符\n，表示换行 CRLF：Carriage Return & Linefeed，\r\n，表示回车并换行
  
## url编码
> RFC3986文档规定，Url中只允许包含英文字母（a-zA-Z）、数字（0-9）、-_.~4个特殊字符以及所有保留字符。
> 对于Unicode字符，RFC文档建议使用utf-8对其进行编码得到相应的字节，然后对每个字节执行百分号编码。

```json
{
"!": "%21",
"*": "%2A",
"\"": "%22",
"'": "%27",
"(": "%28",
")": "%29",
";": "%3B",
":": "%3A",
"@": "%40",
"&": "%26",
"=": "%3D",
"+": "%2B",
"$": "%24",
",": "%2C",
"/": "%2F",
"?": "%3F",
"%": "%25",
"#": "%23",
"[": "%5B",
"]": "%5D"
}
```

