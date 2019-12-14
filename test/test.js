const { decode } = require( "../parse" );
const fs = require( 'fs' );
let buf = fs.readFileSync( "./formdata-1.txt" );

/**
 * @param buf {Buffer}
 * @return {Buffer}
 */
function format( buf ) {
  const list = [];
  let len = 0;
  const str = buf.toString().split( '\n' );
  for ( let item of str ) {
    let b = Buffer.from( item +"\r\n");
    len += b.length;
    list.push( b )
  }
  return Buffer.concat( list, len )
}


buf = format( buf );
decode( buf, buf.length, "----WebKitFormBoundaryMBitmlM04OnkA4Ol" );
