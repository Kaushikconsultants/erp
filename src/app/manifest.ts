import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'R3 EXPORTS - Enterprise ERP',
    short_name: 'R3 EXPORTS',
    description: 'Comprehensive Multi-Entity Enterprise ERP & CRM Software for R3 EXPORTS',
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
