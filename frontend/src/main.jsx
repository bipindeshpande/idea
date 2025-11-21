import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.jsx";
import { ReportsProvider } from "./context/ReportsContext.jsx";
import { ValidationProvider } from "./context/ValidationContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import "./styles.css";

const GA_ID = import.meta.env.VITE_GA_ID;

function Root() {
  useEffect(() => {
    if (!GA_ID) return;
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    gtag("js", new Date());
    gtag("config", GA_ID);

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return (
    <React.StrictMode>
      <HelmetProvider>
        <ThemeProvider>
          <AuthProvider>
            <ReportsProvider>
              <ValidationProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </ValidationProvider>
            </ReportsProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
