import {expect,it} from "vitest";
import {formatPhoneEntry,nationalPhoneDigits,phoneCountry,phoneEditText,phoneEdit,selectedPhoneCountry} from "./phone-input";
import {validPhone} from "./details";
it("formats explicit national input and international pastes for US, Colombia and UK",()=>{
 expect(formatPhoneEntry("2135550123","US")).toBe("+1 (213) 555-0123");
 expect(phoneCountry("+57 300 123 4567")).toBe("CO");
 expect(formatPhoneEntry("+57 3001234567","US")).toBe("+57 300 1234567");
 expect(formatPhoneEntry("+44 20 7946 0018","US")).toBe("+44 20 7946 0018");
 for(const text of ["2135550123","+57 3001234567","+44 20 7946 0018"])expect(validPhone(formatPhoneEntry(text,"US"))).toBe(true);
});
it("preserves empty/invalid input for existing validation and extracts a national part for an explicit country change",()=>{
 expect(formatPhoneEntry("","US")).toBe("");expect(formatPhoneEntry("not a number","US")).toBe("not a number");
 expect(nationalPhoneDigits("+1 (213) 555-0123")).toBe("2135550123");expect(nationalPhoneDigits("+57")).toBe("");
});

it("allows backspace through generated punctuation without trapping the cursor",()=>{
 expect(formatPhoneEntry(phoneEditText("+1 (213)","+1 (213","deleteContentBackward",7),"US")).toBe("+1 21");
 expect(phoneEditText("+1 (213)","+1 (213","insertText",7)).toBe("+1 (213");
 expect(phoneEditText("bad3x","bad3","deleteContentBackward",4)).toBe("bad3");
});

it("respects an explicitly selected shared-code country and switches on another international code",()=>{
 expect(selectedPhoneCountry("+1 (213) 555-0123","CA")).toBe("CA");expect(selectedPhoneCountry("+44 20 7946 0018","JE")).toBe("JE");expect(selectedPhoneCountry("+57 3001234567","CA")).toBe("CO");
});
it("tracks middle-string backward and forward deletion through generated separators",()=>{
 expect(phoneEdit("+1 (213) 555-0123","+1 (213 555-0123","deleteContentBackward",7)).toEqual({text:"+1 (21 555-0123",caret:6});
 expect(phoneEdit("+1 (213) 555-0123","+1 (213 555-0123","deleteContentForward",7)).toEqual({text:"+1 (213 55-0123",caret:7});
});
