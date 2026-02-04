import { redirect } from "next/navigation";

const AdminPage = async () => {
  redirect("/hr/admin/users");
};

export default AdminPage;
