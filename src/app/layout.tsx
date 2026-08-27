import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@/components/ui/modal.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { getCompanySettings } from "./actions/companyActions";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: '--font-inter', 
  display: 'swap',
  preload: true 
});

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
  let fontFamilyString = "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  if (settings?.fontFamily === 'Roboto') { fontFamilyString = "'Roboto', var(--font-inter), sans-serif"; }
  else if (settings?.fontFamily === 'Outfit') { fontFamilyString = "'Outfit', var(--font-inter), sans-serif"; }
  else if (settings?.fontFamily === 'Poppins') { fontFamilyString = "'Poppins', var(--font-inter), sans-serif"; }
  else if (settings?.fontFamily === 'Open Sans') { fontFamilyString = "'Open Sans', var(--font-inter), sans-serif"; }
  else if (settings?.fontFamily === 'Montserrat') { fontFamilyString = "'Montserrat', var(--font-inter), sans-serif"; }
  else if (settings?.fontFamily === 'Lato') { fontFamilyString = "'Lato', var(--font-inter), sans-serif"; }
  else if (settings?.fontFamily === 'Oswald') { fontFamilyString = "'Oswald', var(--font-inter), sans-serif"; }
  else if (settings?.fontFamily === 'System Default') { fontFamilyString = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"; }

  const fontClasses = `${inter.variable}`;

  // Inject Theme Variables
  const primaryColor = settings?.themeColor || '#4f46e5';
  const baseFontSize = settings?.fontSize || '16px';
  const themeStyles = {
    '--accent-primary': primaryColor,
    '--accent-primary-hover': `${primaryColor}dd`,
    '--accent-light': `${primaryColor}1a`,
    '--font-family': fontFamilyString,
    '--app-base-font-size': baseFontSize,
    '--base-font-weight': settings?.useBoldText ? '700' : '400',
    '--radius-md': settings?.buttonRadius || '8px',
    '--radius-sm': settings?.buttonRadius === '9999px' ? '9999px' : settings?.buttonRadius === '0px' ? '0px' : '4px',
    '--radius-lg': settings?.buttonRadius === '9999px' ? '9999px' : settings?.buttonRadius === '0px' ? '0px' : '12px',
    fontSize: baseFontSize,
  } as React.CSSProperties;

  return (
    <html lang="en" className={fontClasses} style={themeStyles}>
      <body className={settings?.useBoldText ? 'global-bold-text' : ''}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
