import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "react-datepicker/dist/react-datepicker.css";
import "./globals.css";
import "@/components/ui/modal.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { getCompanySettings } from "./actions/companyActions";

const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: '--font-outfit', 
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  preload: true 
});

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
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "ERP Tinkal",
  description: "ERP Tinkal - Made by tinkal.in",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ERP Tinkal"
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
  
  // Map font name to actual CSS font-family string (Defaults to 'Outfit')
  let fontFamilyString = "var(--font-outfit), 'Outfit', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  if (settings?.fontFamily === 'Inter') { fontFamilyString = "var(--font-inter), 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"; }
  else if (settings?.fontFamily === 'Roboto') { fontFamilyString = "'Roboto', var(--font-outfit), sans-serif"; }
  else if (settings?.fontFamily === 'Outfit') { fontFamilyString = "var(--font-outfit), 'Outfit', sans-serif"; }
  else if (settings?.fontFamily === 'Poppins') { fontFamilyString = "'Poppins', var(--font-outfit), sans-serif"; }
  else if (settings?.fontFamily === 'Open Sans') { fontFamilyString = "'Open Sans', var(--font-outfit), sans-serif"; }
  else if (settings?.fontFamily === 'Montserrat') { fontFamilyString = "'Montserrat', var(--font-outfit), sans-serif"; }
  else if (settings?.fontFamily === 'Lato') { fontFamilyString = "'Lato', var(--font-outfit), sans-serif"; }
  else if (settings?.fontFamily === 'Oswald') { fontFamilyString = "'Oswald', var(--font-outfit), sans-serif"; }
  else if (settings?.fontFamily === 'System Default') { fontFamilyString = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"; }

  const fontClasses = `${outfit.variable} ${inter.variable}`;

  // Inject Theme Variables
  const primaryColor = settings?.themeColor || '#4f46e5';
  const baseFontSize = settings?.fontSize || '16px';
  const themeStyles = {
    '--accent-primary': primaryColor,
    '--accent-primary-hover': `${primaryColor}dd`,
    '--accent-light': `${primaryColor}14`,
    '--accent-subtle': `${primaryColor}0a`,
    '--accent-border': `${primaryColor}33`,
    '--accent-gradient': `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`,
    '--font-family': fontFamilyString,
    '--app-base-font-size': baseFontSize,
    '--base-font-weight': settings?.useBoldText ? '700' : '400',
    '--radius-md': settings?.buttonRadius || '8px',
    '--radius-sm': settings?.buttonRadius === '9999px' ? '9999px' : settings?.buttonRadius === '0px' ? '0px' : '4px',
    '--radius-lg': settings?.buttonRadius === '9999px' ? '9999px' : settings?.buttonRadius === '0px' ? '0px' : '12px',
    '--radius-full': '9999px',
    fontSize: baseFontSize,
  } as React.CSSProperties;

  return (
    <html lang="en" className={fontClasses} style={themeStyles}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Lato:wght@400;700;900&family=Montserrat:wght@400;500;600;700;800;900&family=Open+Sans:wght@400;600;700;800&family=Oswald:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Poppins:wght@400;500;600;700;800;900&family=Roboto:wght@400;500;700;900&family=Space+Grotesk:wght@500;600;700&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className={settings?.useBoldText ? 'global-bold-text' : ''}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
