/** Include only whole CSS pixels contained by the image, excluding rounded screenshot edges. */
export function containedPixelClip({x,y,width,height}) {
  if(![x,y,width,height].every(Number.isFinite)||width<=0||height<=0)throw new Error("invalid image rectangle");
  const left=Math.ceil(x),top=Math.ceil(y),right=Math.floor(x+width),bottom=Math.floor(y+height);
  if(right<=left||bottom<=top)throw new Error("no whole image pixels to compare");
  return {x:left,y:top,width:right-left,height:bottom-top};
}
