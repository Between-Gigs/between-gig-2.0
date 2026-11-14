import { describe, expect, it } from "vitest";
import { activeEmailNames, emailNames, renderEmail } from "@/emails";
import { appPages } from "./studio/app-pages";
import { projects } from "./workspace/projects";

describe("retired email discovery", () => {
  it("keeps historical templates renderable while active discovery omits them", () => {
    for (const name of ["welcome", "coming-soon"] as const) {
      expect(activeEmailNames).not.toContain(name);
      expect(emailNames).toContain(name);
      const email = renderEmail(name);
      expect(email.subject).toBeTruthy();
      expect(email.html).toContain("<!doctype html>");
      expect(email.text).toBeTruthy();
      expect(appPages.filter(page => page.lane === "email").map(page => page.path)).not.toContain(`/emails/${name}/`);
      expect(projects.find(project => project.id === "emails")!.pages.map(page => page.path)).not.toContain(`/emails/${name}/`);
    }
    expect(activeEmailNames).toHaveLength(5);
  });
});
