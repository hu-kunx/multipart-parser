const fs = require("fs");
const uuid = require("uuid/v1");
const os = require("os");
const TEXT_MIME = ["text/plain"];

/**
 * 获取 "content-"行的结束 index
 * @param buf {Buffer}
 * @param i {Number}
 * @param len {Number}
 * @return {Number}
 */
function getContentHeaderEndIndex(buf, i, len) {
  while (i < len - 3) {
    if (
      buf[i] === 13 &&
      buf[i + 1] === 10 &&
      buf[i + 2] === 13 &&
      buf[i + 3] === 10
    ) {
      break;
    }
    i++;
  }
  return i;
}

/**
 * 解析 content- 头
 * @param contents {Array<String>}
 * @description contents =
 [
 'Content-Disposition: form-data; name="nickName"',
 'Content-type: text/plain; charset=UTF-8',
 'Content-transfer-encoding: quoted-printable'
 ]
 * @return {{disposition: {}, isFile: boolean, encoding: null, contentType: string}}
 */
function parseContentHeader(contents) {
  const result = {
    disposition: {},
    contentType: "text/plain",
    encoding: null,
    isFile: false,
  };
  for (let line of contents) {
    const [contentTag, ...params] = line.split(";");
    const type = contentTag.split(":");
    switch (type[0]) {
      case "Content-Disposition":
        for (let key of params) {
          // split 方法如果被切割的字符位于原字符串的最后那么就会出现一个 ""
          //
          // 如 "123".split("2")   ===> ["1","3"]
          // 如 "123".split("3")   ===> ["12",""]
          if (key == "") {
            continue;
          }
          const [k, v] = key.split("=");
          result.disposition[k.toLocaleLowerCase().trim()] = v.replace(
            /"/g,
            ""
          );
        }
        break;
      case "Content-Type":
        result.contentType = type[1].trim();
        if (params.length > 0 && params[0].includes("charset")) {
          result.encoding = params[0]
            .split("=")[1]
            .replace(/"/g, "")
            .toLocaleLowerCase()
            .trim();
        }
        break;
      case "Content-Transfer-Encoding":
        // rfc7578 4.7 不建议使用
        // todo: 考虑支持 base64
        break;
      default:
        // 其他的标签无视
        break;
    }
  }
  if (
    result.disposition.filename ||
    result.disposition["filename*"] ||
    !TEXT_MIME.includes(result.contentType)
  ) {
    result.isFile = true;
  }
  return result;
}

/**
 * 获取字段 body 的结束 index
 * @param buf {Buffer}
 * @param i {Number}
 * @param len {Number}
 * @param boundary {Buffer}
 * @param boundaryLength {Number}
 * @return {Number}
 */
function getFieldBodyEndIndex(buf, i, len, boundary, boundaryLength) {
  while (i < len - boundaryLength) {
    if (buf[i] === 13 && buf[i + 1] === 10) {
      // 是否是结束
      if (boundary.compare(buf, i + 4, i + 6 + boundaryLength) === 0) {
        break;
      }
      // 下一个字段开始
      if (boundary.compare(buf, i + 4, i + 4 + boundaryLength) === 0) {
        break;
      }
    }
    i++;
  }
  return i;
}

/**
 *
 * @param buf {Buffer}
 * @param length {Number}
 * @param boundary {String}
 * @return {Array}
 * @description
 * 哪些字段是文件?
 * 1. "content-disposition:" 行拥有 filename filename* 字段会被认为是文件
 * 2. "content-type:" 的值不再 TEXT_MIME 中的认定为文件
 * 字符编码
 * 1. 文件
 * 1.1 编码一致为 原始二进制输入,不解码直接写入文件
 * 2. 文本
 * 2.1 如果 "content-type:" 后面有 charset 属性 则以charset 属性的值 为该字段的编码
 * 2.2 如果存在 _charset_ 字段 则以_charset_的值为编码
 * 2.3 其他情况为 utf8
 * 根据 rfc7578 中 建议不使用 "content-transfer-encoding" 故只识别 content-disposition 以及 content-type
 * 文件直接写入到系统临时文件目录
 */
function decode(buf, length, boundary) {
  const boundaryBuf = Buffer.from(boundary);
  const boundaryLen = boundaryBuf.length;
  const fields = [];
  let i = 0;
  while (i < length) {
    const endIndex = getContentHeaderEndIndex(buf, i, length);
    const content = buf.slice(i, endIndex).toString().split("\r\n").slice(1);
    const header = parseContentHeader(content);
    const bodyEndIndex = getFieldBodyEndIndex(
      buf,
      endIndex + 4,
      length,
      boundaryBuf,
      boundaryLen
    );
    let value = "";
    // 是否是文件
    if (header.isFile) {
      const path = `${os.tmpdir()}/node-${uuid()}`;
      const fsWrite = fs.createWriteStream(path);
      // +4 是因为 content- 和内容间隔 \r\n\r\n
      // 经过上传 mp3 文件比较 发现 没有多出字节
      fsWrite.write(buf.slice(endIndex + 4, bodyEndIndex));
      fsWrite.close();
      value = {
        path,
        size: bodyEndIndex - endIndex + 4,
        filename: header.disposition.filename,
      };
    } else {
      value = buf.slice(endIndex + 4, bodyEndIndex);
    }
    i = bodyEndIndex + 2;
    if (i >= length - boundaryLen - 4) {
      break;
    }
    fields.push({ ...header, value });
  }
  const result = {};
  const _charset_ = fields.find((v) => v.disposition.name === "_charset_");
  const utf8 = ["utf8", "utf-8", "UTF8", "UTF-8", "ascii", "ASCII"];
  let defaultEncoding = "utf8";
  for (let { disposition, value, isFile, encoding } of fields) {
    if (!isFile) {
      if (encoding) {
        defaultEncoding = encoding;
      } else if (_charset_ && disposition.name !== "_charset_") {
        defaultEncoding = _charset_.value.toString();
      }
      if (utf8.includes(defaultEncoding)) {
        value = value.toString();
      }
    }
    if (!result[disposition.name]) {
      result[disposition.name] = value;
    } else if (Array.isArray(result[disposition.name])) {
      result[disposition.name].push(value);
    } else {
      result[disposition.name] = [result[disposition.name], value];
    }
  }
  return result;
}

/**
 *
 * @param req
 * @param opts {{limit?:number}}
 * @return {Promise<null>}
 */
async function parse(req, opts) {
  if (!req.headers["content-type"]) {
    return null;
  }
  const contentType = req.headers["content-type"].split(";");
  if (
    contentType[0] !== "multipart/form-data" ||
    !contentType[1].includes("boundary")
  ) {
    return null;
  }
  if (opts && opts.limit && req.headers["Content-Length"] > opts.limit) {
    return Promise.reject(new Error("Data size exceeded limit"));
  }
  const boundary = contentType[1].split("=")[1];
  const bufList = [];
  let len = 0;
  function onData(data) {
    bufList.push(data);
    len += data.length;
  }
  return new Promise((resolve, reject) => {
    function onError(err) {
      reject(err.message);
    }
    req.on("data", onData);
    req.on("error", onError);
    req.on("end", () => {
      const buf = Buffer.concat(bufList, len);
      resolve(decode(buf, len, boundary));
    });
  });
}

module.exports = {
  parse,
  decode,
};
