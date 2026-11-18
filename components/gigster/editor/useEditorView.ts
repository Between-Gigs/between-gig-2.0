"use client";
import {useSyncExternalStore} from "react";
import {editorView,type EditorView} from "@/lib/profile/editor-view";
const event="bg2-editor-view";
const read=()=>editorView(window.location.search);
function subscribe(fn:()=>void){window.addEventListener("popstate",fn);window.addEventListener(event,fn);return()=>{window.removeEventListener("popstate",fn);window.removeEventListener(event,fn);};}
export const useEditorView=()=>useSyncExternalStore(subscribe,read,()=>"edit" as const);
export function setEditorView(view:EditorView){const url=new URL(window.location.href);if(view==="preview")url.searchParams.set("view","preview");else url.searchParams.delete("view");window.history.pushState(window.history.state,"",url);window.dispatchEvent(new Event(event));}
