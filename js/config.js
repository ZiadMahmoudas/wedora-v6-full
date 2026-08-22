const SUPABASE_URL = "https://xzjpviejoqfxipxekzhk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0BJlNcsx23v89uBm1kwm_g_6AJSRHU9";

export const CONFIG = {
  BRAND: "WEDORA",
  DEFAULT_LANG: "ar",
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  CURRENCY: "EGP",
  UNDERCUT_AMOUNT: 250,
  VODAFONE_CASH_NUMBER: "01000000000",
  INSTAPAY_HANDLE: "yourname@instapay",
  SUPPORT_WHATSAPP: "201000000000",
  SUPPORT_EMAIL: "support@example.com",
  DEMO_MODE:
    location.protocol === "file:" ||
    SUPABASE_URL.includes("YOUR_PROJECT") ||
    SUPABASE_ANON_KEY.includes("YOUR_PUBLISHABLE")
};
