export type Locale = "en" | "ar";

export const defaultLocale: Locale = "en";
export const localeCookieName = "maze_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ar";
}

export function getDirection(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export const messages = {
  en: {
    localeLabel: "Language",
    localeName: "English",
    switchLocale: "AR",
    auth: {
      signIn: "Sign in",
      signUp: "Sign up",
      profile: "Profile",
      dashboard: "Dashboard",
      close: "Close",
      openMenu: "Open navigation menu",
      closeMenu: "Close navigation menu",
    },
    nav: {
      pricing: "Pricing",
      docs: "Docs",
      usage: "Usage",
      liquid: "Liquid",
      heatmap: "Heatmap",
      settings: "Settings",
      profile: "Profile",
      dashboard: "Dashboard",
      product: "Product",
      resources: "Resources",
      footerTagline: "Observe. Infer. Act.",
    },
  },
  ar: {
    localeLabel: "اللغة",
    localeName: "العربية",
    switchLocale: "EN",
    auth: {
      signIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
      profile: "الملف الشخصي",
      dashboard: "لوحة التحكم",
      close: "إغلاق",
      openMenu: "فتح قائمة التنقل",
      closeMenu: "إغلاق قائمة التنقل",
    },
    nav: {
      pricing: "الأسعار",
      docs: "التوثيق",
      usage: "الاستخدام",
      liquid: "Liquid",
      heatmap: "الخريطة الحرارية",
      settings: "الإعدادات",
      profile: "الملف الشخصي",
      dashboard: "لوحة التحكم",
      product: "المنتج",
      resources: "الموارد",
      footerTagline: "راقب. استنتج. تحرك.",
    },
  },
} as const;

export type Messages = (typeof messages)[Locale];

export function getMessages(locale: Locale): Messages {
  return messages[locale];
}
