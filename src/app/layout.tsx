import type { Metadata, Viewport } from "next";
import { Inter, Roboto, Outfit, Poppins, Open_Sans, Montserrat, Lato, Oswald } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { getCompanySettings } from "./actions/companyActions";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const roboto = Roboto({ weight: ['400', '500', '700'], subsets: ["latin"], variable: '--font-roboto' });
const outfit = Outfit({ subsets: ["latin"], variable: '--font-outfit' });
const poppins = Poppins({ weight: ['400', '500', '600', '700'], subsets: ["latin"], variable: '--font-poppins' });
const openSans = Open_Sans({ subsets: ["latin"], variable: '--font-open-sans' });
const montserrat = Montserrat({ subsets: ["latin"], variable: '--font-montserrat' });
const lato = Lato({ weight: ['400', '700'], subsets: ["latin"], variable: '--font-lato' });
const oswald = Oswald({ subsets: ["latin"], variable: '--font-oswald' });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Heart Of Business",
  description: "Comprehensive CRM for Sportswear B2B",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HOB CRM"
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings: any = null;
  try {
    const res = await getCompanySettings();
    settings = res?.settings || null;
  } catch (e) {
    console.error("Layout error fetching company settings:", e);
  }
  
  // Map font name to actual CSS font-family string
  let fontFamilyString = "var(--font-inter), sans-serif";
  let fontClass = inter.variable;
  if (settings?.fontFamily === 'Roboto') { fontFamilyString = "var(--font-roboto), sans-serif"; fontClass = roboto.variable; }
  else if (settings?.fontFamily === 'Outfit') { fontFamilyString = "var(--font-outfit), sans-serif"; fontClass = outfit.variable; }
  else if (settings?.fontFamily === 'Poppins') { fontFamilyString = "var(--font-poppins), sans-serif"; fontClass = poppins.variable; }
  else if (settings?.fontFamily === 'Open Sans') { fontFamilyString = "var(--font-open-sans), sans-serif"; fontClass = openSans.variable; }
  else if (settings?.fontFamily === 'Montserrat') { fontFamilyString = "var(--font-montserrat), sans-serif"; fontClass = montserrat.variable; }
  else if (settings?.fontFamily === 'Lato') { fontFamilyString = "var(--font-lato), sans-serif"; fontClass = lato.variable; }
  else if (settings?.fontFamily === 'Oswald') { fontFamilyString = "var(--font-oswald), sans-serif"; fontClass = oswald.variable; }
  else if (settings?.fontFamily === 'System Default') { fontFamilyString = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"; fontClass = ""; }

  // Inject Theme Variables
  const themeStyles = {
    '--accent-primary': settings?.themeColor || '#4f46e5',
    '--font-family': fontFamilyString,
    '--base-font-weight': settings?.useBoldText ? '600' : '400',
    '--radius-md': settings?.buttonRadius || '8px',
    '--radius-sm': settings?.buttonRadius === '9999px' ? '9999px' : settings?.buttonRadius === '0px' ? '0px' : '4px',
    '--radius-lg': settings?.buttonRadius === '9999px' ? '9999px' : settings?.buttonRadius === '0px' ? '0px' : '12px',
  } as React.CSSProperties;

  return (
    <html lang="en" style={themeStyles}>
      <body className={fontClass}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
