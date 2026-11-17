import { handleProductDevelopment } from "@/lib/server/product-development";
export const POST = (request: Request) => handleProductDevelopment(request);
