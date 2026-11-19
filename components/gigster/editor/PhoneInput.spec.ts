import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {expect,it} from "vitest";
import {PhoneInput} from "@/components/gigster/editor/PhoneInput";
const render=(id="booking-phone",value="+1 (213) 555-0123")=>renderToStaticMarkup(createElement(PhoneInput,{id,value,onChange:()=>{}}));
it("puts the US first with remaining countries alphabetic and keeps full option names",()=>{
 const options=[...render().matchAll(/<option[^>]*value="([^"]+)"[^>]*>([^<]+)<\/option>/g)];
 expect(options[0]?.[1]).toBe("US");
 const rest=options.slice(1).map(x=>x[2]); expect(rest).toEqual([...rest].sort((a,b)=>a.localeCompare(b)));
 expect(options.find(x=>x[1]==="GB")?.[2]).toContain("United Kingdom");
});
it("keeps a labeled native country picker inside the phone frame before the number",()=>{
 const html=render();
 expect(html).toContain('for="booking-phone-country"');
 expect(html).toContain('id="booking-phone-country"');
 expect(html).toMatch(/<select[^>]*class="[^"]*absolute/);
 expect(html.indexOf('<select')).toBeLessThan(html.indexOf('<input'));
 expect(html).toContain('Booking contact only');
 expect(html).toContain('aria-describedby="booking-phone-hint"');
 expect(render("other-phone")).toContain('id="other-phone-country"');
});
it("does not rewrite a saved international number on render",()=>{
 expect(render("booking-phone","+44 20 7946 0018")).toContain('value="+44 20 7946 0018"');
});
