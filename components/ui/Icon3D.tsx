"use client";
import { cx } from "@ds/components";
import {
  Banknote, Bell, Briefcase, BrushCleaning, Brush, CalendarDays, Camera, Car, CircleCheck, Clapperboard, Clipboard, Droplets, Eye, FilePen, Film,
  Flower2, Hammer, Hand, Handshake, Hourglass, House, Image, Key, Lightbulb, Lock, Mail, Map, MapPin, Megaphone, MessageCircle, Mic, Package,
  Palette, PartyPopper, Scissors, Settings, Shield, Shirt, ShoppingBasket, Sofa, Sparkles, Sprout, Star, ThumbsUp, Ticket, Tickets, Toolbox, Video,
  Wrench, type LucideIcon,
} from "lucide-react";
import { useLook } from "@/components/site/LookSync";
import type { Icon3DName } from "@/lib/icons3d";
import { asset } from "@/lib/site";

/* The editorial look (Green Room) is the gold standard from Justin's Flow p3 design: line icons, no emoji or 3D art.
   Every 3D icon has a line twin here, so each page keeps its layout and only the art changes. */
const line: Record<Icon3DName, LucideIcon> = {
  clapper_board: Clapperboard, scissors: Scissors, camera: Camera, light_bulb: Lightbulb, hammer: Hammer, hammer_and_wrench: Wrench,
  spiral_calendar: CalendarDays, round_pushpin: MapPin, money_bag: Banknote, shield: Shield, speech_balloon: MessageCircle, artist_palette: Palette,
  dress: Shirt, house: House, toolbox: Toolbox, automobile: Car, world_map: Map, speaking_head: Mic, check_mark_button: CircleCheck, sparkles: Sparkles,
  star: Star, envelope: Mail, lipstick: Brush, potted_plant: Sprout, film_frames: Film, package: Package, briefcase: Briefcase, clipboard: Clipboard,
  memo: FilePen, framed_picture: Image, party_popper: PartyPopper, hourglass_done: Hourglass, bell: Bell, key: Key, locked: Lock, ticket: Ticket,
  admission_tickets: Tickets, megaphone: Megaphone, sewing_needle: Scissors, couch_and_lamp: Sofa, video_camera: Video, bubbles: Droplets,
  broom: BrushCleaning, handshake: Handshake, waving_hand: Hand, thumbs_up: ThumbsUp, gear: Settings, eyes: Eye, bouquet: Flower2, basket: ShoppingBasket,
};

/** One 3D icon (decorative by default; give it a label when it carries meaning alone). In the editorial look, its line twin. */
export function Icon3D({ name, label, className }: { name: Icon3DName; label?: string; className?: string }) {
  const look = useLook();
  if (look === "editorial") {
    const Line = line[name] ?? Sparkles;
    return (
      <span role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
        className={cx("inline-grid size-8 shrink-0 place-items-center text-current", className)}>
        <Line className="size-2/3" strokeWidth={1.5} />
      </span>
    );
  }
  return <img src={asset(`img/icons3d/${name}.png`)} alt={label ?? ""} aria-hidden={label ? undefined : true} width={128} height={128} loading="lazy" decoding="async"
    className={cx("size-8 shrink-0 select-none object-contain", className)} />;
}
