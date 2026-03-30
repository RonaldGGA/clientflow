export const metadata = {
  title: "Auth |",
  description: "Login page",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div lang="en">
      <div>{children}</div>
    </div>
  );
}
