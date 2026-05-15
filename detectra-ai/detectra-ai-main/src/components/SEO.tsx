import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
}

export default function SEO({
  title = 'Detectra AI - Multimodal Video Intelligence Platform',
  description = 'Detectra AI helps security teams analyze surveillance footage with multimodal AI: incident detection, multilingual transcription, logo recognition, and premium investigation reports.',
  keywords = [
    'AI detection',
    'artificial intelligence',
    'computer vision',
    'machine learning',
    'Nexariza AI',
    'Detectra AI',
    'University of Central Punjab',
    'FOIT',
    'Dr. Usman Aamer',
    'Dr. Yasin Nasir',
    'face detection',
    'industrial automation',
    'medical imaging',
    'pattern recognition',
    'edge computing',
    'real-time processing'
  ],
  image = '/og-image.jpg',
  url = typeof window !== 'undefined' ? window.location.href : 'https://detectra.ai',
}: SEOProps) {
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="Detectra AI by Nexariza AI" />
      <meta name="robots" content="index, follow" />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Detectra AI" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Additional Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content="#22d3ee" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Favicon */}
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Detectra AI",
          "alternateName": "Detectra AI by Nexariza AI",
          "url": "https://detectra.ai",
          "logo": "https://detectra.ai/logo.png",
          "description": description,
          "foundingDate": "2023",
          "founder": {
            "@type": "Person",
            "name": "Ahmad Yasin"
          },
          "mentor": [
            {
              "@type": "Person",
              "name": "Dr. Usman Aamer",
              "jobTitle": "Director of FOIT",
              "description": "Supervisor for Phases 1-2",
              "worksFor": {
                "@type": "Organization",
                "name": "University of Central Punjab"
              }
            },
            {
              "@type": "Person",
              "name": "Dr. Yasin Nasir",
              "description": "Supervisor for Phases 3-4",
              "worksFor": {
                "@type": "Organization",
                "name": "University of Central Punjab"
              }
            }
          ],
          "sameAs": [
            "https://linkedin.com/company/detectra-ai",
            "https://github.com/Ahmadyasin1",
            "https://twitter.com/detectra_ai"
          ],
          "contactPoint": {
            "@type": "ContactPoint",
            "telephone": "+92-370-7348001",
            "contactType": "customer service",
            "email": "contact@nexariza.com"
          }
        })}
      </script>
    </Helmet>
  );
}
