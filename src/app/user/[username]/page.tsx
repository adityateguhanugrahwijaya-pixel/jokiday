import { redirect } from "next/navigation";

export default function UserRedirectPage({
  params,
}: {
  params: { username: string };
}) {
  redirect(`/designer/${params.username}`);
}
