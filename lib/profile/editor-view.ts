export type EditorView = "edit" | "preview";
export const editorView = (search: string): EditorView => new URLSearchParams(search).get("view") === "preview" ? "preview" : "edit";
/** Preview is the Gigster's My profile view, while the same draft editor stays mounted. */
export function profileNavPath(pathname: string, view: EditorView) {
 const raw=pathname.endsWith("/")?pathname:`${pathname}/`;
 if(raw.startsWith("/profile/canvas/"))return view==="preview"?"/profile/":"/profile/canvas/";
 return raw.startsWith("/profile/edit/")?"/profile/canvas/":raw;
}
