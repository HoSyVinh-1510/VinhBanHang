import { useEffect } from "react";

const createHeadLink = (id, href) => {
  if (document.getElementById(id)) {
    return null;
  }

  const linkElement = document.createElement("link");
  linkElement.id = id;
  linkElement.rel = "stylesheet";
  linkElement.href = href;
  document.head.appendChild(linkElement);
  return linkElement;
};

const useMultiShopStyles = () => {
  useEffect(() => {
    const createdLinks = [];
    const originalBodyClass = document.body.className;

    document.body.className = "";

    const stylesToInject = [
      {
        id: "multishop-font",
        href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
      },
      {
        id: "multishop-fa",
        href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.10.0/css/all.min.css",
      },
      { id: "multishop-animate", href: "/multishop/lib/animate/animate.min.css" },
      { id: "multishop-owl", href: "/multishop/lib/owlcarousel/assets/owl.carousel.min.css" },
      { id: "multishop-style", href: "/multishop/css/style.min.css" },
    ];

    stylesToInject.forEach((style) => {
      const created = createHeadLink(style.id, style.href);
      if (created) {
        createdLinks.push(created);
      }
    });

    return () => {
      createdLinks.forEach((linkElement) => linkElement.remove());
      document.body.className = originalBodyClass;
    };
  }, []);
};

export default useMultiShopStyles;
