const { decode } = require("../lib/multipart-from-data.js");
const fs = require("fs");
let buf = fs.readFileSync("./test/data/formdata-1.txt");
// 文件会生成创建到系统临时文件夹内
// let buf = fs.readFileSync("./test/data/formdata-2.txt");

/**
 * @param buf {Buffer}
 * @return {Buffer}
 */
function format(buf) {
  const list = [];
  let len = 0;
  const str = buf.toString().split("\n");
  for (let item of str) {
    let b = Buffer.from(item + "\r\n");
    len += b.length;
    list.push(b);
  }
  return Buffer.concat(list, len);
}

buf = format(buf);
const result = decode(
  buf,
  buf.length,
  "----WebKitFormBoundaryMBitmlM04OnkA4Ol"
);
console.log(result);
