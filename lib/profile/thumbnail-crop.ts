import {asset} from "@/lib/site";
import {rectFor,type Fit} from "./work-fit";
/** An explicit custom-thumbnail edit creates ordinary JPEG bytes accepted by the existing upload contract.
 * It never changes the video or the original portfolio photo, and never appends unsupported fit fragments to a thumb. */
export async function cropThumbnail(source:string,fit:Fit):Promise<string>{
 if(!source.startsWith("data:image/")&&!/^\/media\/[A-Za-z0-9-]{1,64}$/.test(source))throw new Error("Choose an uploaded image to crop.");
 if(![fit.cx,fit.cy,fit.z,fit.a].every(Number.isFinite)||fit.z<1||fit.z>4||fit.a<=0)throw new Error("Invalid crop.");
 const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error("Unable to load thumbnail."));img.src=asset(source);});
 const r=rectFor(fit,16/9),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(Math.min(1200,image.naturalWidth*r.w)));canvas.height=Math.max(1,Math.round(canvas.width/(16/9)));
 const context=canvas.getContext("2d");if(!context)throw new Error("Unable to crop image.");context.drawImage(image,r.x*image.naturalWidth,r.y*image.naturalHeight,r.w*image.naturalWidth,r.h*image.naturalHeight,0,0,canvas.width,canvas.height);
 return canvas.toDataURL("image/jpeg",0.9);
}
