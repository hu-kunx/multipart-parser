## multipart-parser

### "multipart/form-data"

* 只处理 "content-type: multipart/form-data;"
* 文件直接写入到系统临时文件目录, **不处理编码**
* 多个字段名相同将被合并到数组
* 上传多个文件建议 设置为同一个 name 而不是 multipart/mixed
* 字符编码暂时仅仅支持 utf-8, 如果有定义非 utf8 ascii 编码则返回 buffer
* 不支持 filename* 字段
* 不支持 url(百分比)编码
* rfc7578 中 建议不使用 "content-transfer-encoding" 故只识别 content-disposition 以及 content-type

**todo**
* 在流的接受过程中处理, 而不是等待流全部接收

**哪些字段是文件?**
 1. "content-disposition:" 行拥有 filename filename* 字段会被认为是文件
 2. "content-type:" 的值不再 TEXT_MIME 中的认定为文件
 
**字符编码**
 1. 文件
 编码一致为 原始二进制输入,不解码直接写入文件
 2. 文本
    * 2.1 如果 "content-type:" 后面有 charset 属性 则以charset 属性的值(该值需要是utf8) 为该字段的编码
    * 2.2 如果存在 _charset_ 字段 则以_charset_的值为编码
    * 2.3 其他情况为 utf8
