import "./globals.css";

export const metadata = {
  title: "HKM Vizag WhatsApp CRM",
  description: "WhatsApp message management for Hare Krishna Movement Visakhapatnam",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
