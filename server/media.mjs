export const maxMediaBytes=25*1024*1024
export function detectMedia(content){
  if(content.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png'
  if(content.subarray(0,3).equals(Buffer.from([255,216,255])))return 'image/jpeg'
  if(content.toString('ascii',0,4)==='RIFF'&&content.toString('ascii',8,12)==='WEBP')return 'image/webp'
  if(content.length>=12&&content.toString('ascii',4,8)==='ftyp')return 'video/mp4'
  if(content.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))return 'video/webm'
  return ''
}
export function sendMedia(request,response,{mime,content}){
  const headers={'Content-Type':mime,'Cache-Control':'no-store','Accept-Ranges':'bytes'},length=content.length,range=request.headers.range
  if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);let start,end
    if(match&&(match[1]||match[2])){start=match[1]?Number(match[1]):Math.max(0,length-Number(match[2]));end=match[1]?(match[2]?Math.min(length-1,Number(match[2])):length-1):length-1}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=length){response.writeHead(416,{...headers,'Content-Range':`bytes */${length}`});return response.end()}
    response.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':`bytes ${start}-${end}/${length}`});return response.end(content.subarray(start,end+1))
  }
  response.writeHead(200,{...headers,'Content-Length':length});return response.end(content)
}
