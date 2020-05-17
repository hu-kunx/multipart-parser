const http = require("http");
const fs = require("fs");
const parse_body = require("../lib/multipart-from-data.js");
http
  .createServer(async (req, res) => {
    if (req.method.toLocaleUpperCase() === "POST" && req.url === "/upload") {
      let value = await parse_body(req, {});
      console.log(value);
      res.end(JSON.stringify(value));
    } else {
      res.setHeader("content-type", "text/html");
      // res.setHeader("content-Disposition", 'test.html');
      // res.setHeader("content-Disposition", 'attachment;test.html');
      fs.createReadStream("./index.html").pipe(res);
    }
  })
  .listen(3000);
console.log("listen: ", 3000);
