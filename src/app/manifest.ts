import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ERP Tinkal - CRM & Sales ERP',
    short_name: 'ERP Tinkal',
    description: 'Comprehensive Enterprise B2B CRM and Sales ERP Software - Made by tinkal.in',
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
