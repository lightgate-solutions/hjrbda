import { redirect } from "next/navigation";

const Page = async () => {
  redirect("/mail/inbox");
};

export default Page;
