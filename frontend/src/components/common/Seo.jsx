import { Helmet } from "react-helmet-async";

const SITE_URL = "https://ideabunch.com";

export default function Seo({
  title = "Idea Bunch",
  description = "AI-assisted startup idea generator that transforms your goals, time, and skills into actionable opportunities.",
  path = "/",
  keywords = "ai startup ideas, business idea generator, personalized startup recommendations",
  type = "website",
  ogImage = `${SITE_URL}/og-image.jpg`,
  children,
}) {
  const canonical = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {children}
    </Helmet>
  );
}
