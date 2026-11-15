import {it,expect} from "vitest";
import {createHash} from "node:crypto";
import {renderEmail} from "@/emails";
import {diagnostic} from "@/emails/diagnostic";
// Captured from current main d6deb233 with unchanged default sample/context. Pin non-invitation bytes.
const baseline={
  "sign-in-code": "870545e67b35b04b085e78b949b557b1bc7946d76a70e2d51b093b0ed23306b9",
  "profile-submitted": "53645c7d7ffd9f08c292dcb9e67802b2ed8c598d2737f0da4b5f78e507c85481",
  "welcome": "4512485d55de3358eb0fac5da4b8decee41096b55ef9f7eb3cf09fe56ea56555",
  "coming-soon": "3599511e485d05c59260dcf7620c6fda99220c51a03e7000695d8eb090dcf9bb",
  "approved": "8052e3dc4332d0e473ca71582ea6c59c6c3d0ba4eee6b922accc941e68db2d58",
  "changes-requested": "5f695d8c4e9ecee884b2df5c581994497e4baf1732a50ad1f0b5659da16c2905",
  "diagnostic": "c333d0c7043bcf29ad51730b89ea74cb815c5c25a7eb93423708a785550f0b9b"
};
it("preserves current-main diagnostic and every unrelated source-rendered email byte",()=>{for(const [name,hash] of Object.entries(baseline)){const rendered=name==="diagnostic"?diagnostic():renderEmail(name as Parameters<typeof renderEmail>[0]);expect(createHash("sha256").update(JSON.stringify(rendered)).digest("hex"),name).toBe(hash);}});
