import type { Metadata } from "next";
import { EmailPreview } from "@/components/emails/EmailPreview";
import { emailNames, emailTemplates } from "@/emails";
import type { EmailTemplate } from "@/lib/data";

export const dynamicParams = false;
export const generateStaticParams = () => emailNames.map((name) => ({ name }));

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  return { title: `${emailTemplates[name as EmailTemplate]?.label ?? "Email"} email` };
}

export default async function Page({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <EmailPreview name={name as EmailTemplate} />;
}
