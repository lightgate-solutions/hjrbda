// Layout removed - authorization is handled at the page level
// This allows "Apply for Leave" to be accessible to all employees
// while "Leave Management" and "Annual Leave Balances" are restricted
export default function LeavesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <section>{children}</section>;
}
