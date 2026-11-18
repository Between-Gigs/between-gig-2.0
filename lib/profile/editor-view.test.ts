import {expect,it} from "vitest";
import {editorView,profileNavPath} from "./editor-view";
it("maps only the mounted canvas preview to My profile without changing other navigation",()=>{
 expect(editorView("?view=preview")).toBe("preview");expect(editorView("?view=unknown")).toBe("edit");
 expect(profileNavPath("/profile/canvas/","preview")).toBe("/profile/");expect(profileNavPath("/profile/canvas/","edit")).toBe("/profile/canvas/");
 expect(profileNavPath("/profile/edit/","preview")).toBe("/profile/canvas/");expect(profileNavPath("/owners/","preview")).toBe("/owners/");
});
