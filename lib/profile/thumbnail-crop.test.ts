import {expect,it} from "vitest";
import {cropThumbnail} from "./thumbnail-crop";
it("refuses external/foreign sources and non-finite crop parameters before loading an image",async()=>{
 const fit={cx:.5,cy:.5,z:1,a:1};
 for(const source of ["https://example.com/image.jpg","javascript:alert(1)","/api/private-file"])await expect(cropThumbnail(source,fit)).rejects.toThrow("uploaded image");
 await expect(cropThumbnail("data:image/jpeg;base64,AA==",{...fit,cx:Infinity})).rejects.toThrow("Invalid crop");
});
