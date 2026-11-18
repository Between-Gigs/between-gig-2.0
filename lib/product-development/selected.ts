import { data } from "@/lib/data";
import { productClient } from "./client";
import { sampleProduct } from "./sample";
export const productDevelopment =
  data.kind === "live" ? productClient : sampleProduct;
