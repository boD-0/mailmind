import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MailMind",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body style={{ margin: 0, padding: 0, background: "#080808" }}>
        {children}
      </body>
    </html>
  );
}