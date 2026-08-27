import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Heart Of Business - CRM & Sales ERP',
    short_name: 'HOB CRM',
    description: 'Comprehensive Enterprise B2B CRM and Sales ERP Software by Ashish Goyal',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ef4444',
    orientation: 'any',
    categories: ['business', 'productivity', 'finance', 'utilities'],
    icons: [
      {
        src: '/logo.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any'
      },
      {
        src: '/logo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable'
      }
    ],
  };
}
