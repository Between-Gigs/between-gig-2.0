/*
 * Airbnb-style 3D icons (Fluent Emoji 3D, MIT; public/img/icons3d/README.md), keyed by meaning so a screen asks
 * for "rate" or a service's name, not a file. Departments and services map to the closest object of the craft.
 */
export type Icon3DName =
  | "clapper_board" | "scissors" | "camera" | "light_bulb" | "hammer" | "hammer_and_wrench" | "spiral_calendar" | "round_pushpin"
  | "money_bag" | "shield" | "speech_balloon" | "artist_palette" | "dress" | "house" | "toolbox" | "automobile" | "world_map"
  | "speaking_head" | "check_mark_button" | "sparkles" | "star" | "envelope" | "lipstick" | "potted_plant" | "film_frames"
  | "package" | "briefcase" | "clipboard" | "memo" | "framed_picture" | "party_popper" | "hourglass_done" | "bell" | "key"
  | "locked" | "ticket" | "admission_tickets" | "megaphone" | "sewing_needle" | "couch_and_lamp" | "video_camera" | "bubbles"
  | "broom" | "handshake" | "waving_hand" | "thumbs_up" | "gear" | "eyes" | "bouquet" | "basket";

const byCraft: [RegExp, Icon3DName][] = [
  [/alteration|sewing|tailor|hem/i, "sewing_needle"],
  [/styling/i, "sparkles"],
  [/consult|advice|coach|mentor/i, "speech_balloon"],
  [/organi[sz]|closet|declutter/i, "basket"],
  [/custom|bespoke|piece/i, "scissors"],
  [/repair|fix|assembly/i, "toolbox"],
  [/plan/i, "clipboard"],
  [/laundry|care/i, "bubbles"],
  [/wardrobe|costume|fashion|styling.*personal|alteration|sewing|fit/i, "dress"],
  [/makeup|beauty/i, "lipstick"],
  [/hair/i, "scissors"],
  [/furniture|build|carpent|prop/i, "hammer_and_wrench"],
  [/interior|home|room|decor|set dec/i, "couch_and_lamp"],
  [/event|table|party/i, "party_popper"],
  [/photo|portrait|image/i, "camera"],
  [/video|film|archive/i, "video_camera"],
  [/light|grip|electric/i, "light_bulb"],
  [/camera/i, "camera"],
  [/art dep|paint|design/i, "artist_palette"],
  [/location|venue|scout/i, "world_map"],
  [/production office|coordinat|plan|organiz/i, "clipboard"],
  [/coach|mentor/i, "speech_balloon"],
  [/closet|clothing|organization/i, "basket"],
  [/flower|floral/i, "bouquet"],
];

/** The 3D icon for a department, service or offer. */
export const craftIcon = (label: string, fallback?: string): Icon3DName =>
  byCraft.find(([re]) => re.test(label))?.[1] ?? (fallback ? craftIcon(fallback) : "sparkles");
