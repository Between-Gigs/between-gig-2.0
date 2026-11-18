export const ENTITY = "user_interface_visibility";
/** This schema is created only by an explicit verified-admin setup operation. */
export const NAVIGATION_SCHEMA = {
  key: ENTITY, name: "User interface visibility", displayField: "user",
  description: "Per-superadmin menu visibility only. Does not grant or revoke permissions.",
  fields: [
    { key: "user", name: "User", type: "user_reference", config: { required: true } },
    { key: "active", name: "Active", type: "boolean", config: { required: true } },
    { key: "schema_version", name: "Schema version", type: "number", config: { required: true } },
    { key: "revision", name: "Revision", type: "number", config: { required: true } },
    { key: "visible_modes", name: "Visible modes", type: "json", config: { required: true } },
    { key: "visible_items", name: "Visible menu items", type: "json", config: { required: true } },
  ],
};
