export type Point={left:number;top:number}
export function clampToolsPosition(point:Point,width:number,height:number,viewportWidth:number,viewportHeight:number):Point{return{left:Math.max(8,Math.min(point.left,Math.max(8,viewportWidth-width-8))),top:Math.max(8,Math.min(point.top,Math.max(8,viewportHeight-height-8)))}}
