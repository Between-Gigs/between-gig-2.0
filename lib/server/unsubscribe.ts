import { companyOs, configFromEnv, type CompanyOs } from "./companyos";
const page = (status: number, title: string, body: string) => new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>' +
    title + " · Between Gigs</title><body><main><h1>" + title + "</h1>" + body + "</main></body></html>", { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" } });
export async function unsubscribePage(req: Request, deps: {
    cos?: CompanyOs;
} = {}) {
    const token = new URL(req.url).searchParams.get("token");
    if (!token || token.length > 2000 || !/^[A-Za-z0-9_.-]+$/.test(token))
        return page(400, "Check your unsubscribe link", "<p>Open the unsubscribe link in your Between Gigs email.</p>");
    try {
        await (deps.cos ?? companyOs(configFromEnv())).unsubscribe(token, req.method === "POST");
        if (req.method === "POST")
            return page(200, "You’re unsubscribed", "<p>You won’t receive further Between Gigs invitations or marketing emails. Essential account and booking messages are unaffected.</p>");
        return page(200, "Email preferences", '<p>Stop Between Gigs invitations and marketing emails. You don’t need to sign in.</p><form method="post" action="?token=' + token + '"><button type="submit">Unsubscribe from invitations and marketing</button></form>');
    }
    catch {
        return page(503, "We couldn’t update your preferences", '<p>Please try this email link again shortly, or contact <a href="mailto:hello@between-gigs.com">hello@between-gigs.com</a>.</p>');
    }
}
