export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p className="mt-2 text-gray-500">
        You don’t have permission to view this page.
      </p>
    </div>
  );
}
