/** Fictional previews use the revised form. Live builds retain the old field until the recipe is verified. */
export const departmentFieldRetired = () => process.env.NEXT_PUBLIC_PROFILE_NO_DEPARTMENT === "1" ||
  (process.env.NEXT_PUBLIC_DATA_SOURCE !== "api" && process.env.BG_BUILD !== "server");
