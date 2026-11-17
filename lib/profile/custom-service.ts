/** Existing private services_other text: first line is its name; remaining lines describe the service. */
export function readCustomService(text: string) {
  const [first = "", ...rest] = text.replace(/\r\n/g, "\n").split("\n");
  return { name: first.trim(), description: rest.join(" ").trim() };
}
export function customServiceError(text: string): string | undefined {
  const {name,description}=readCustomService(text);
  if(!name)return "Name your service.";
  if(name.length>60)return "Keep your service name to 60 characters.";
  if(!description)return "Add one line about what a customer can hire you to do.";
  if(description.length>120)return "Keep your service description to 120 characters.";
}
/** Fictional previews are enabled. Real-service activation requires a separately reviewed build flag. */
export const customServiceReviewEnabled=()=>process.env.NEXT_PUBLIC_CUSTOM_SERVICE_REVIEW==="1" || (process.env.NEXT_PUBLIC_DATA_SOURCE!=="api" && process.env.BG_BUILD!=="server");
