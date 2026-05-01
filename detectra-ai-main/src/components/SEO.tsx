import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
}

export default function SEO({
  title = 'Detecra AI - Empowering the World with Intelligent Detection',
  description = 'Advanced AI detection systems powered by Nexariza AI. Guided by Dr. Usman Aamer, Director of FOIT at University of Central Punjab. Transforming industries with cutting-edge artificial intelligence.',
  keywords = [
    'AI detection',
    'artificial intelligence',
    'computer vision',
    'machine learning',
    'Nexariza AI',
    'Detecra AI',
    'University of Central Punjab',
    'FOIT',
    'Dr. Usman Aamer',
    'face detection',
    'industrial automation',
    'medical imaging',
    'pattern recognition',
    'edge computing',
    'real-time processing'
  ],
  image = '/og-image.jpg',
  url = typeof window !== 'undefined' ? window.location.href : 'https://detecra.ai',
}: SEOProps) {
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="Detecra AI by Nexariza AI" />
      <meta name="robots" content="index, follow" />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Detecra AI" />
      
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
          "name": "Detecra AI",
          "alternateName": "Detecra AI by Nexariza AI",
          "url": "https://detecra.ai",
          "logo": "https://detecra.ai/logo.png",
          "description": description,
          "foundingDate": "2023",
          "founder": {
            "@type": "Person",
            "name": "Ahmad Yasin"
          },
          "supervisor": {
            "@type": "Person",
            "name": "Dr. Usman Aamer",
            "jobTitle": "Director of FOIT",
            "worksFor": {
              "@type": "Organization",
              "name": "University of Central Punjab"
            }
          },
          "sameAs": [
            "https://linkedin.com/company/detecra-ai",
            "https://github.com/detecra-ai",
            "https://twitter.com/detecra_ai"
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
