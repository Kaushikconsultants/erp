import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Heart Of Business - CRM & Sales ERP',
    short_name: 'HOB CRM',
    description: 'Comprehensive B2B CRM and Sales ERP software',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#4f46e5',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '64x64',
        type: 'image/x-icon',
        purpose: 'maskable'
      }
    ],
  };
}
